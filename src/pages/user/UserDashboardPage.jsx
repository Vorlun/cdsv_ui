import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useQuery } from "@/services/query/reactQueryLite";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { ApiError } from "@/services/api/apiError";
import ActivityList from "@/features/dashboard/components/user-dashboard/ActivityList";
import { EmptyStateCard, UploadCtaLink } from "@/features/dashboard/components/user-dashboard/EmptyStates";
import FileTable from "@/features/dashboard/components/user-dashboard/FileTable";
import UploadTelemetryPanel from "@/features/dashboard/components/user-dashboard/UploadTelemetryPanel";
import QuickActions from "@/features/dashboard/components/user-dashboard/QuickActions";
import StatsCards from "@/features/dashboard/components/user-dashboard/StatsCards";
import UserDashboardSkeleton from "@/features/dashboard/components/user-dashboard/UserDashboardSkeleton";
import { safeSnippet } from "@/features/dashboard/components/user-dashboard/formatters";
import StatusSummary from "@/features/dashboard/components/user-dashboard/StatusSummary";
import { getSocDashboardOverview } from "@/services/api";
import { useTelemetryFeed } from "@/hooks/useTelemetryFeed";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { useInfrastructureTelemetry } from "@/hooks/useInfrastructureTelemetry";
import { useRealtimeUploadTelemetry } from "@/hooks/useRealtimeUploadTelemetry";
import { useSecurityAnalytics } from "@/hooks/useSecurityAnalytics";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import InfrastructureCluster from "@/components/dashboard/InfrastructureCluster";
import SecurityAnalyticsSummary from "@/components/dashboard/SecurityAnalyticsSummary";
import SecurityInitializationPanel from "@/components/dashboard/SecurityInitializationPanel";
import TelecomTopologyPanel from "@/components/dashboard/TelecomTopologyPanel";
import SystemHealthMonitor from "@/components/dashboard/SystemHealthMonitor";
import ThreatAnalysisDrawer from "@/components/dashboard/ThreatAnalysisDrawer";
import FileForensicsDrawer from "@/components/dashboard/FileForensicsDrawer";
import SecurityReportButton from "@/components/dashboard/SecurityReportButton";

/** Stable fallback when dashboard payload has not arrived yet */
const EMPTY_ACTIVITY = [];
const EMPTY_UPLOAD_TIMELINE = [];

function buildSiemFromOverview(payload) {
  const activity = Array.isArray(payload?.activity) ? payload.activity : [];
  if (activity.length) return activity;
  const files = Array.isArray(payload?.recentFiles) ? payload.recentFiles : [];
  if (files.length) {
    return files.slice(0, 8).map((file, idx) => ({
      id: `local-fallback-${file.id}-${idx}`,
      type: "upload",
      file: `${file.name} secured in vault`,
      at: file.uploadedAt || new Date().toISOString(),
      severity:
        String(file.threatLevel || "").toUpperCase() === "HIGH"
          ? "high"
          : String(file.threatLevel || "").toUpperCase() === "MEDIUM"
            ? "medium"
            : "low",
      source: "Upload Pipeline",
      category: "upload_complete",
      description: "Secure ingestion completed and indexed.",
      node: "node-3",
      cluster: "vault-cluster",
      pipeline: "secure-upload",
      tags: ["upload-pipeline", "aes-256", "sha-256"],
    }));
  }
  return EMPTY_ACTIVITY;
}

function mapEventToTimelineRow(event) {
  const typeRaw = String(event?.type ?? "").toLowerCase();
  const mappedType = typeRaw.includes("upload")
    ? "upload"
    : typeRaw.includes("auth")
      ? "login"
      : typeRaw.includes("encryption")
        ? "encryption"
        : typeRaw.includes("integrity")
          ? "integrity"
          : typeRaw.includes("scan") || typeRaw.includes("malware")
            ? "scan"
            : typeRaw.includes("session")
              ? "session"
              : typeRaw.includes("anomaly")
                ? "anomaly"
                : "telemetry";
  const metadata = event?.metadata && typeof event.metadata === "object" ? event.metadata : {};
  const normalizedSeverity = String(event?.severity ?? "info").toLowerCase();
  return {
    id: event.id ?? `telemetry-${Date.now()}`,
    type: mappedType,
    file: event.message ?? "Realtime telemetry event",
    at: event.createdAt ?? new Date().toISOString(),
    severity: ["critical", "high", "medium", "low", "info"].includes(normalizedSeverity)
      ? normalizedSeverity
      : "info",
    source: event.source ?? "Telemetry",
    category: event.type ?? "telemetry",
    description: event.message ?? "",
    node: metadata.node ?? "node-3",
    cluster: metadata.cluster ?? "vault-cluster",
    pipeline: metadata.pipeline ?? "secure-upload",
    tags: Array.isArray(metadata.tags) ? metadata.tags : undefined,
  };
}

export default memo(function UserDashboardPage() {
  const { user } = useAuth();
  const { isLight } = useWorkspaceControl();

  const [refreshing, setRefreshing] = useState(false);
  const [liveActivity, setLiveActivity] = useState(EMPTY_ACTIVITY);
  const [nowTick, setNowTick] = useState(Date.now());
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const headerSubtitle = useMemo(() => safeSnippet(user?.email, 200), [user?.email]);

  const dashboardQuery = useQuery({
    queryKey: ["soc-dashboard-overview", user?.email],
    queryFn: async () => {
      return getSocDashboardOverview();
    },
    refetchInterval: 20_000,
  });
  const payload = dashboardQuery.data ?? null;
  const uploadTelemetry = useRealtimeUploadTelemetry(payload?.uploadsTimeline ?? EMPTY_UPLOAD_TIMELINE, user?.email ?? "guest");
  const dashboardRefetch = dashboardQuery.refetch;
  const uploadTelemetryRefetch = uploadTelemetry.refetch;

  useEffect(() => {
    if (!payload) return;
    setLiveActivity(buildSiemFromOverview(payload));
  }, [payload]);

  useTelemetryFeed((event) => {
    if (!event) return;
    if (event._channel === "overview") return;
    if (event._channel !== "event") return;
    setLiveActivity((prev) => {
      const mapped = mapEventToTimelineRow(event);
      if (prev.some((row) => row.id === mapped.id)) return prev;
      return [mapped, ...prev].slice(0, 80);
    });
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const signalSummary = useMemo(() => {
    const critical = liveActivity.filter((row) => row.severity === "high").length;
    const warning = liveActivity.filter((row) => row.severity === "medium").length;
    return {
      critical,
      warning,
      newEvents: Math.min(3, liveActivity.length),
    };
  }, [liveActivity]);
  const shell = isLight ? "text-slate-900" : "text-[#E5E7EB]";

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dashboardRefetch().finally(() => setRefreshing(false));
    uploadTelemetryRefetch();
  }, [dashboardRefetch, uploadTelemetryRefetch]);

  useEffect(() => {
    const syncDashboard = () => {
      void dashboardRefetch();
      void uploadTelemetryRefetch();
    };
    window.addEventListener("soc:vault-mutated", syncDashboard);
    return () => window.removeEventListener("soc:vault-mutated", syncDashboard);
  }, [dashboardRefetch, uploadTelemetryRefetch]);

  const { events: telemetryEvents } = useTelemetrySocket(80);
  const infrastructure = useInfrastructureTelemetry(payload?.healthStrip ?? [], telemetryEvents);
  const analyticsLive = useSecurityAnalytics(payload?.analytics ?? [], telemetryEvents);
  const baselineLive = useRealtimeMetrics(payload?.baselineMetrics ?? [], telemetryEvents);

  if (dashboardQuery.isLoading || !payload) {
    return (
      <div className={`p-6 md:p-8 xl:px-10 ${shell}`}>
        <UserDashboardSkeleton isLight={isLight} />
      </div>
    );
  }
  if (dashboardQuery.isError) {
    const message = dashboardQuery.error instanceof ApiError ? dashboardQuery.error.message : "Dashboard request failed";
    return (
      <div className={`p-6 md:p-8 xl:px-10 ${shell}`}>
        <EmptyStateCard
          isLight={isLight}
          title="Security telemetry unavailable"
          description={message}
          action={<UploadCtaLink label="Retry" isLight={isLight} />}
        />
      </div>
    );
  }
  const telemetryAgeSec = Math.max(
    0,
    Math.floor((nowTick - new Date(payload.telemetrySyncAt).getTime()) / 1000),
  );

  return (
    <div className={`relative p-4 md:p-6 xl:px-8 ${shell}`}>
      <div className="relative mx-auto max-w-[1680px] space-y-4 2xl:space-y-5">
        <header className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-6 py-5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1628]"}`}>
          <div>
            <h2 className={`text-3xl font-semibold tracking-wide xl:text-4xl ${isLight ? "text-slate-900" : "text-white/95"}`}>
              Welcome back
              {user?.fullName ? `, ${safeSnippet(user.fullName, 80)}` : ""}
            </h2>
            <p className={`mt-1.5 text-sm ${isLight ? "text-slate-600" : "text-[#9CA3AF]"}`}>
              {headerSubtitle || "Your secure workspace dashboard"} · live telemetry
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SecurityReportButton
              payload={payload}
              telemetryEvents={telemetryEvents}
              uploadTelemetry={uploadTelemetry}
              infrastructure={infrastructure}
              isLight={isLight}
            />
            <motion.button
              type="button"
              aria-busy={refreshing}
              disabled={refreshing}
              animate={refreshing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.45 }}
              onClick={handleRefresh}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition enabled:hover:opacity-95 disabled:pointer-events-none disabled:opacity-60 ${
                isLight ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border-white/15 bg-[#0F172A] text-[#E5E7EB] hover:bg-white/[0.04]"
              }`}
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? "animate-spin text-sky-500" : ""}`} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh"}
            </motion.button>
          </div>
        </header>

        <StatsCards
          isLight={isLight}
          uploadsTotal={payload.uploadsTotal}
          lastLoginAt={payload.lastLoginAt}
          securityScore={payload.securityScore}
          securityBreakdown={payload.securityBreakdown}
          activityCount={liveActivity.length}
          signalSummary={signalSummary}
          liveActivity={liveActivity}
        />

        <InfrastructureCluster isLight={isLight} data={infrastructure} />

        <div className="space-y-3">
          <div className="grid items-start gap-3 xl:grid-cols-[1.05fr_0.95fr]">
            <TelecomTopologyPanel isLight={isLight} infrastructure={infrastructure} />
            <SystemHealthMonitor
              isLight={isLight}
              infrastructure={infrastructure}
              telemetryEvents={telemetryEvents}
              uploadRows={uploadTelemetry.rows}
            />
          </div>

          <SecurityAnalyticsSummary isLight={isLight} analytics={analyticsLive} telemetryAgeSec={telemetryAgeSec} />
        </div>

        <SecurityInitializationPanel
          isLight={isLight}
          baselineMetrics={baselineLive}
          telemetrySyncAt={payload.telemetrySyncAt}
          monitoringNodesOnline={payload.monitoringNodesOnline}
          telemetryEvents={telemetryEvents}
        />

        <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
          <div className="min-h-0 min-w-0 space-y-4 xl:col-span-8">
            <div className="min-h-[352px] min-w-0">
              <UploadTelemetryPanel
                rows={uploadTelemetry.rows}
                hasSignal={uploadTelemetry.hasSignal}
                connected={uploadTelemetry.connected}
                lastSyncAt={uploadTelemetry.lastSyncAt}
                isLight={isLight}
              />
            </div>

            <ActivityList rows={liveActivity} isLight={isLight} onEventSelect={setSelectedThreat} />
          </div>

          <div className="min-h-0 min-w-0 space-y-4 xl:col-span-4">
            <StatusSummary
              isLight={isLight}
              fileStatus={payload.fileStatus}
              blockedRatioPct={
                payload.fileStatus.safe + payload.fileStatus.blocked + payload.fileStatus.pending
                  ? Math.round((payload.fileStatus.blocked / (payload.fileStatus.safe + payload.fileStatus.blocked + payload.fileStatus.pending)) * 100)
                  : 0
              }
            />
            <QuickActions isLight={isLight} onboardingSteps={payload.onboardingSteps} />
          </div>
        </div>

        <FileTable
          recentFiles={payload.recentFiles}
          isLight={isLight}
          onFileSelect={setSelectedFile}
          selectedFileId={selectedFile?.id || selectedFile?.name || null}
        />
      </div>
      <ThreatAnalysisDrawer event={selectedThreat} isLight={isLight} onClose={() => setSelectedThreat(null)} />
      <FileForensicsDrawer file={selectedFile} isLight={isLight} onClose={() => setSelectedFile(null)} />
    </div>
  );
});
