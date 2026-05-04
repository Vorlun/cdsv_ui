import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import ActivityList from "@/features/dashboard/components/user-dashboard/ActivityList";
import { EmptyStateCard, UploadCtaLink } from "@/features/dashboard/components/user-dashboard/EmptyStates";
import FileTable from "@/features/dashboard/components/user-dashboard/FileTable";
import QuickActions from "@/features/dashboard/components/user-dashboard/QuickActions";
import StatsCards from "@/features/dashboard/components/user-dashboard/StatsCards";
import UserDashboardSkeleton from "@/features/dashboard/components/user-dashboard/UserDashboardSkeleton";
import { safeSnippet } from "@/features/dashboard/components/user-dashboard/formatters";
import { buildMockUserDashboard } from "@/services/mockUserDashboard";
import { delay } from "@/utils/delay";
import { useSimulatedRecentActivity } from "@/hooks/useSimulatedRecentActivity";
import StatusSummary from "@/features/dashboard/components/user-dashboard/StatusSummary";

const UploadChart = lazy(() => import("@/features/dashboard/components/user-dashboard/UploadChart"));

/** Stable fallback when dashboard payload has not arrived yet */
const EMPTY_ACTIVITY = [];

export default memo(function UserDashboardPage() {
  const { user } = useAuth();
  const { isLight } = useWorkspaceControl();
  const [searchParams] = useSearchParams();
  const forceEmptyDemo = searchParams.get("demo") === "empty";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const hasLoadedOnce = useRef(false);

  const headerSubtitle = useMemo(() => safeSnippet(user?.email, 200), [user?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const showFullSkeleton = !hasLoadedOnce.current;
      if (showFullSkeleton) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      await delay(showFullSkeleton ? 620 : 480);
      if (cancelled) return;

      let data = buildMockUserDashboard(user?.email);
      if (forceEmptyDemo) {
        data = {
          ...data,
          activity: [],
          recentFiles: [],
          uploadsTimeline: [],
          fileStatus: { safe: 0, blocked: 0, pending: 0 },
          uploadsTotal: 0,
          securityBreakdown: {
            positives: [
              { label: "Safe uploads", points: 0, detail: "0 cleared objects" },
              { label: "Encrypted files", points: 0, detail: "0 at-rest" },
            ],
            negatives: [
              { label: "Pending reviews", points: 0, detail: "0 in queue" },
              { label: "Blocked files", points: 0, detail: "0 policy hits" },
            ],
          },
          securityScore: 0,
        };
      }
      setPayload(data);
      hasLoadedOnce.current = true;

      setLoading(false);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, forceEmptyDemo, refreshToken]);

  const activitySource = payload?.activity ?? EMPTY_ACTIVITY;

  const simEnabled = Boolean(payload?.activity?.length) && !forceEmptyDemo;

  const { rows: liveActivity } = useSimulatedRecentActivity(activitySource, {
    enabled: simEnabled,
    maxItems: 5,
  });

  const shell = isLight ? "text-slate-900" : "text-[#E5E7EB]";
  const chartFallback = (
    <div className={`h-[240px] animate-pulse rounded-2xl ${isLight ? "bg-slate-200/70" : "bg-white/[0.06]"}`} aria-hidden />
  );

  const handleRefresh = () => {
    setRefreshToken((n) => n + 1);
  };

  if (loading || !payload) {
    return (
      <div className={`p-6 md:p-8 ${shell}`}>
        <UserDashboardSkeleton isLight={isLight} />
      </div>
    );
  }

  return (
    <div className={`p-6 md:p-8 ${shell}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-semibold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Welcome back
              {user?.fullName ? `, ${safeSnippet(user.fullName, 80)}` : ""}
            </h2>
            <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-[#9CA3AF]"}`}>
              {headerSubtitle || "Your secure workspace dashboard"} · mock telemetry
            </p>
          </div>
          <motion.button
            type="button"
            aria-busy={refreshing}
            disabled={refreshing}
            animate={refreshing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
            onClick={handleRefresh}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition enabled:hover:opacity-95 disabled:pointer-events-none disabled:opacity-60 ${
              isLight ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border-white/15 bg-[#0F172A] text-[#E5E7EB] hover:bg-white/[0.04]"
            }`}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${refreshing ? "animate-spin text-sky-500" : ""}`} aria-hidden />
            {refreshing ? "Refreshing…" : "Refresh"}
          </motion.button>
        </header>

        <StatsCards
          isLight={isLight}
          uploadsTotal={payload.uploadsTotal}
          lastLoginAt={payload.lastLoginAt}
          securityScore={payload.securityScore}
          securityBreakdown={payload.securityBreakdown}
          activityCount={liveActivity.length}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-3">
            <Suspense fallback={chartFallback}>
              {payload.uploadsTimeline.length ? (
                <UploadChart data={payload.uploadsTimeline} isLight={isLight} />
              ) : (
                <EmptyStateCard
                  isLight={isLight}
                  title="No upload volume yet"
                  description="Charts appear after your first ingestion run through the upload pipeline."
                  action={<UploadCtaLink label="Upload File" isLight={isLight} />}
                />
              )}
            </Suspense>

            <ActivityList rows={liveActivity} isLight={isLight} />
          </div>

          <div className="space-y-6 xl:col-span-2">
            <StatusSummary
              isLight={isLight}
              fileStatus={payload.fileStatus}
              blockedRatioPct={
                payload.fileStatus.safe + payload.fileStatus.blocked + payload.fileStatus.pending
                  ? Math.round((payload.fileStatus.blocked / (payload.fileStatus.safe + payload.fileStatus.blocked + payload.fileStatus.pending)) * 100)
                  : 0
              }
            />
            <QuickActions isLight={isLight} />
          </div>
        </div>

        <FileTable recentFiles={payload.recentFiles} isLight={isLight} />
      </div>
    </div>
  );
});
