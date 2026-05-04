import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import DashboardSkeleton from "@/features/dashboard/components/DashboardSkeleton";
import DashboardStatGrid from "@/features/dashboard/components/DashboardStatGrid";
import DashboardOperationalStrip from "@/features/dashboard/components/DashboardOperationalStrip";
import ThreatFeed from "@/features/dashboard/components/ThreatFeed";
import LogsTable from "@/features/dashboard/components/LogsTable";
import QuickActions from "@/features/dashboard/components/QuickActions";
import DashboardScanBanner from "@/features/dashboard/components/DashboardScanBanner";
import { Modal, ReportDrawer } from "@/features/dashboard/components/DashboardModals";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { useGovernanceConsole } from "@/hooks/useGovernanceConsole";
import { useLogs } from "@/hooks/useLogs";
import { useThreats } from "@/hooks/useThreats";
import { useEnterpriseSecurityScan } from "@/hooks/useEnterpriseSecurityScan";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { sanitizePlainText } from "@/utils/sanitize";
import { isProbablyIpv4 } from "@/utils/ipValidation";
import { buildSocUiGates, normalizeSocRole } from "@/utils/socPermissions";

const LazyChartsPanel = lazy(() => import("@/features/dashboard/components/DashboardChartsPanel"));

const SOC_STREAM_MS = 5500;

function ChartsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-[260px] animate-pulse rounded-2xl bg-white/[0.06]" aria-hidden />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-[300px] animate-pulse rounded-2xl bg-white/[0.06] xl:col-span-2" />
        <div className="h-[300px] animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
      <div className="h-[260px] animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}

function csvLine(values) {
  return values
    .map((cell) => `"${sanitizePlainText(String(cell), 1024).replace(/"/g, '""')}"`)
    .join(",");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sanitizeLogExportRow(row) {
  return {
    id: sanitizePlainText(row.id, 48),
    time: sanitizePlainText(row.time, 32),
    user: sanitizePlainText(row.user, 160),
    email: sanitizePlainText(row.email, 160),
    ip: sanitizePlainText(row.ip, 64),
    action: sanitizePlainText(row.action, 160),
    result: sanitizePlainText(row.result, 64),
  };
}

export default memo(function AdminDashboardPage() {
  const { user } = useAuth();
  const actorPrincipal = sanitizePlainText(user?.email ?? user?.fullName ?? "operator@test.com", 254);
  const socPersona = normalizeSocRole(user?.socRole);
  const { governance } = useGovernanceConsole({ streamIntervalMs: SOC_STREAM_MS });
  const dashGates = useMemo(() => buildSocUiGates(socPersona, governance), [socPersona, governance]);
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [telemetryBusy, setTelemetryBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [scanGatewayBusy, setScanGatewayBusy] = useState(false);

  const {
    snapshot,
    status: dashboardStatus,
    error: dashboardError,
    reload: reloadDashboard,
    retry: retryDashboard,
    chartRange,
    setChartRange,
    chartData,
    decorateMetricCards,
    blockedIps,
    blockSinkholeIpv4,
    activeSessions,
  } = useDashboard({
    streamIntervalMs: SOC_STREAM_MS,
    actorPrincipal,
    socRole: socPersona,
  });

  const {
    status: logsStatus,
    error: logsError,
    filtered: filteredLogs,
    pagedLogs,
    page: logsPage,
    pageCount: logsPageCount,
    setPage: setLogsPage,
    query: logsQuery,
    setQueryAndResetPage: setLogsQueryAndResetPage,
    statusFilter: logsStatusFilter,
    setStatusAndResetPage: setLogsStatusAndResetPage,
    sortBy: logsSortBy,
    toggleSort: toggleLogsSort,
    reload: reloadLogs,
    retry: retryLogs,
    isEmpty: logsIsEmpty,
  } = useLogs({ streamIntervalMs: SOC_STREAM_MS });

  const {
    status: threatsStatus,
    error: threatsError,
    visibleAlerts,
    dismissThreat,
    reload: reloadThreats,
    retry: retryThreats,
  } = useThreats({ soundEnabled, streamIntervalMs: SOC_STREAM_MS });

  const { scanState, run: runSecurityScan } = useEnterpriseSecurityScan(snapshot?.scanStages ?? []);

  const [modal, setModal] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [blockIpInput, setBlockIpInput] = useState("");
  const [forceLogoutEmail, setForceLogoutEmail] = useState("");
  const [reportTimestamp, setReportTimestamp] = useState("");

  useEffect(() => {
    const first = snapshot?.revocablePrincipals?.[0]?.value;
    if (first) setForceLogoutEmail(first);
  }, [snapshot?.revocablePrincipals]);

  const pushToast = useCallback((message, tone = "info") => {
    const id = `toast-${toastIdRef.current++}`;
    setToasts((prev) => [...prev, { id, message: sanitizePlainText(message, 240), tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 2500);
  }, []);

  const metricCards = useMemo(() => {
    if (!snapshot) return [];
    return decorateMetricCards({
      blockedCount: blockedIps.length,
      openThreatCount: visibleAlerts.length,
    });
  }, [snapshot, decorateMetricCards, blockedIps.length, visibleAlerts.length]);

  const telemetryResync = useCallback(async () => {
    setTelemetryBusy(true);
    try {
      await Promise.all([reloadDashboard(), reloadLogs(), reloadThreats()]);
      pushToast("Dashboard telemetry reconciled", "success");
    } catch {
      pushToast("Telemetry resync incomplete — retry from tiles", "info");
    } finally {
      setTelemetryBusy(false);
    }
  }, [reloadDashboard, reloadLogs, reloadThreats, pushToast]);

  const exportLogsAs = useCallback(
    async (format) => {
      const fmt = format === "json" ? "json" : "csv";
      const rows = filteredLogs.map(sanitizeLogExportRow);
      try {
        await socApi.exportLogsAck({
          format: fmt,
          rows,
          actor: actorPrincipal,
          socRole: socPersona,
        });
      } catch (err) {
        const { message } = normalizeSocError(err);
        pushToast(message, "info");
        return;
      }
      if (fmt === "json") {
        const text = JSON.stringify(rows, null, 2);
        downloadBlob("soc-admin-logs.json", new Blob([text], { type: "application/json" }));
        pushToast("Logs exported as JSON", "success");
        return;
      }
      const header = "time,user,email,ip,action,result";
      const body = rows.map((row) =>
        csvLine([row.time, row.user, row.email, row.ip, row.action, row.result]),
      );
      const csv = [header, ...body].join("\n");
      downloadBlob("soc-admin-logs.csv", new Blob([csv], { type: "text/csv" }));
      pushToast("Logs exported as CSV", "success");
    },
    [actorPrincipal, filteredLogs, pushToast, socPersona],
  );

  const confirmBlockIp = useCallback(async () => {
    const candidate = sanitizePlainText(blockIpInput.trim(), 64);
    if (!candidate) return;
    if (!isProbablyIpv4(candidate)) {
      pushToast("Invalid IPv4 address", "info");
      return;
    }
    setBlockBusy(true);
    const result = await blockSinkholeIpv4(candidate);
    setBlockBusy(false);
    if (!result.ok) {
      pushToast(result.message ?? "Sinkhole policy rejected", "info");
      return;
    }
    setModal(null);
    setBlockIpInput("");
    pushToast(`Prefix ${candidate} blocked at perimeter`, "success");
  }, [blockIpInput, blockSinkholeIpv4, pushToast]);

  const confirmForceLogout = useCallback(async () => {
    const principal = sanitizePlainText(forceLogoutEmail, 160).trim().toLowerCase();
    if (!principal) return;
    setRevokeBusy(true);
    try {
      await socApi.revokeSession(principal);
      setModal(null);
      pushToast(`Session for ${principal} invalidated`, "success");
    } catch (err) {
      const { message } = normalizeSocError(err);
      pushToast(message, "info");
    } finally {
      setRevokeBusy(false);
    }
  }, [forceLogoutEmail, pushToast]);

  const dispatchGatewayScan = useCallback(async () => {
    setScanGatewayBusy(true);
    try {
      const correlation = await socApi.startScan();
      runSecurityScan({
        threatDetected: correlation.threatDetected,
        mediumAlerts: correlation.mediumAlerts,
        blockedToday: correlation.blockedToday,
      });
      setModal(null);
    } catch (err) {
      const { message } = normalizeSocError(err);
      pushToast(message, "info");
    } finally {
      setScanGatewayBusy(false);
    }
  }, [pushToast, runSecurityScan]);

  const rerunScanFromReport = useCallback(async () => {
    setScanGatewayBusy(true);
    try {
      const correlation = await socApi.startScan();
      runSecurityScan({
        threatDetected: correlation.threatDetected,
        mediumAlerts: correlation.mediumAlerts,
        blockedToday: correlation.blockedToday,
      });
      setModal(null);
    } catch (err) {
      const { message } = normalizeSocError(err);
      pushToast(message, "info");
    } finally {
      setScanGatewayBusy(false);
    }
  }, [pushToast, runSecurityScan]);

  const openScanReport = useCallback(() => {
    setReportTimestamp(new Date().toLocaleString());
    setModal("report");
  }, []);

  const exportReportPdf = useCallback(() => {
    const ts = sanitizePlainText(reportTimestamp || new Date().toLocaleString(), 120);
    const reportContent = [
      "SOC Security Scan Report",
      `Timestamp: ${ts}`,
      "Status: Medium Severity Anomalies Detected",
      "Security Health Score: 92/100",
      "",
      "Operational note: telecom evidence packs SHOULD be digitally signed server-side.",
    ].join("\n");
    downloadBlob("soc-scan-summary.txt", new Blob([reportContent], { type: "text/plain" }));
    pushToast("Evidence summary exported", "success");
  }, [reportTimestamp, pushToast]);

  const onCopyIp = useCallback((ip) => {
    const safe = sanitizePlainText(ip, 64);
    void navigator.clipboard.writeText(safe);
    pushToast(`Copied ${safe}`, "info");
  }, [pushToast]);

  const dashboardBootstrapping = dashboardStatus === "loading" && !snapshot;
  const revocable = snapshot?.revocablePrincipals ?? [];

  if (dashboardBootstrapping) {
    return (
      <div className="relative overflow-hidden bg-[#0B0F1A] p-5 md:p-8">
        <BackgroundGlow />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[#0B0F1A] p-5 md:p-8">
      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-[1400px] space-y-6">
        {dashboardStatus === "error" ? (
          <ErrorBanner
            title="SOC KPI gateway unavailable"
            message={sanitizePlainText(dashboardError ?? "Unknown error", 400)}
            onRetry={() => void retryDashboard()}
          />
        ) : null}

        <DashboardStatGrid
          cards={metricCards}
          loading={dashboardStatus === "loading" || dashboardStatus === "error"}
        />

        <DashboardOperationalStrip
          activeSessions={activeSessions}
          healthScore={snapshot?.healthScore ?? 92}
          chartRange={chartRange}
          onChartRangeChange={setChartRange}
        />

        <Suspense fallback={<ChartsFallback />}>
          <LazyChartsPanel
            chartData={chartData}
            threatDistribution={snapshot?.threatDistribution ?? []}
          />
        </Suspense>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ThreatFeed
            fetchStatus={threatsStatus}
            errorMessage={threatsError}
            onRetryFetch={() => void retryThreats()}
            syncing={telemetryBusy && threatsStatus === "ready"}
            items={visibleAlerts}
            onDismiss={dismissThreat}
            soundEnabled={soundEnabled}
            onSoundToggle={setSoundEnabled}
          />
          <div className="xl:col-span-2">
            <LogsTable
              refreshing={telemetryBusy && logsStatus === "ready"}
              fetchStatus={logsStatus}
              errorMessage={logsError}
              onRetryFetch={() => void retryLogs()}
              isEmpty={logsIsEmpty}
              query={logsQuery}
              onQueryChange={setLogsQueryAndResetPage}
              statusFilter={logsStatusFilter}
              onStatusChange={setLogsStatusAndResetPage}
              pagedLogs={pagedLogs}
              page={logsPage}
              pageCount={logsPageCount}
              sortBy={logsSortBy}
              onToggleSort={toggleLogsSort}
              onPrevPage={() => setLogsPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setLogsPage((p) => Math.min(logsPageCount, p + 1))}
              onSelectRow={setSelectedLog}
              onCopyIp={onCopyIp}
            />
          </div>
        </section>

        <div>
          <QuickActions
            loading={telemetryBusy}
            blockIpDisabled={!dashGates.canUiBlockIp}
            exportLogsDisabled={!dashGates.canUiExportLogs}
            onBlockIp={() => setModal("block")}
            onExportLogsModal={() => setModal("export")}
            onForceLogoutModal={() => setModal("logout")}
            onScanModal={() => setModal("scan")}
            onRefreshModal={() => setModal("refresh")}
          />
          <DashboardScanBanner
            scanState={scanState}
            scanStages={snapshot?.scanStages ?? []}
            healthScoreStatic={snapshot?.healthScore ?? 92}
            onViewReport={openScanReport}
          />
        </div>
      </div>

      {modal === "block" ? (
        <Modal title="Block IPv4 Prefix" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input
              value={blockIpInput}
              onChange={(event) =>
                setBlockIpInput(sanitizePlainText(event.target.value, 64))
              }
              placeholder="203.11.2.90"
              maxLength={45}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60"
            />
            <button
              type="button"
              disabled={blockBusy || !dashGates.canUiBlockIp}
              title={!dashGates.canUiBlockIp ? "SOC persona lacks manual sinkhole + matrix entitlement" : undefined}
              onClick={() => void confirmBlockIp()}
              className="w-full rounded-xl bg-[#B91C1C] px-4 py-2.5 text-sm font-medium text-[#FCA5A5] hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {blockBusy ? "Provisioning sinkhole…" : "Confirm Sinkhole"}
            </button>
          </div>
        </Modal>
      ) : null}

      {modal === "logout" ? (
        <Modal title="Force Subscriber Logout" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <select
              value={forceLogoutEmail}
              onChange={(event) => setForceLogoutEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white"
            >
              {revocable.map(({ label, value }) => (
                <option key={value} value={value}>
                  {sanitizePlainText(label, 120)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={revokeBusy}
              onClick={() => void confirmForceLogout()}
              className="w-full rounded-xl bg-[#312E81] px-4 py-2.5 text-sm font-medium text-[#DDD6FE] hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revokeBusy ? "Revoking session…" : "Invalidate Session Tokens"}
            </button>
          </div>
        </Modal>
      ) : null}

      {modal === "export" ? (
        <Modal title="Export Filtered Logs" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              Downloads sanitized rows that match filters. Acknowledges northbound export policy (mock).
            </p>
            {!dashGates.canUiExportLogs ? (
              <p className="text-xs text-[#F97316]">
                Export interchange is blocked for this SOC persona or the live Access Roles matrix in Security Control Center.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!dashGates.canUiExportLogs}
                onClick={() => {
                  void exportLogsAs("csv");
                  setModal(null);
                }}
                className="rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-[#BFDBFE] hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download CSV
              </button>
              <button
                type="button"
                disabled={!dashGates.canUiExportLogs}
                onClick={() => {
                  void exportLogsAs("json");
                  setModal(null);
                }}
                className="rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-medium text-[#BBF7D0] hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download JSON
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "scan" ? (
        <Modal title="Queued Security Scan" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              Evaluates signalling-plane tokens, ingestion posture, and cross-POP correlation (simulated OSS job).
            </p>
            <button
              type="button"
              disabled={scanGatewayBusy}
              onClick={() => void dispatchGatewayScan()}
              className="w-full rounded-xl bg-[#064E3B] px-4 py-2.5 text-sm font-medium text-[#6EE7B7] hover:bg-[#065F46] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanGatewayBusy ? "Correlation ticket opened…" : "Dispatch Scan Worker"}
            </button>
          </div>
        </Modal>
      ) : null}

      {modal === "refresh" ? (
        <Modal title="Telemetry Resync" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">Pull freshest payloads from KPI gateway, threats, and audit matrix.</p>
            <button
              type="button"
              disabled={telemetryBusy}
              onClick={() => {
                void telemetryResync();
                setModal(null);
              }}
              className="w-full rounded-xl bg-[#1F2937] px-4 py-2.5 text-sm font-medium text-[#E5E7EB] hover:bg-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm Resync
            </button>
          </div>
        </Modal>
      ) : null}

      {selectedLog ? (
        <Modal title="Event Detail" onClose={() => setSelectedLog(null)}>
          <dl className="space-y-2 text-sm text-[#E5E7EB]">
            <div>
              <dt className="text-[#9CA3AF]">Time</dt>
              <dd>{sanitizePlainText(selectedLog.time, 32)}</dd>
            </div>
            <div>
              <dt className="text-[#9CA3AF]">Principal</dt>
              <dd>{sanitizePlainText(selectedLog.user, 160)}</dd>
            </div>
            <div>
              <dt className="text-[#9CA3AF]">Email</dt>
              <dd>{sanitizePlainText(selectedLog.email, 160)}</dd>
            </div>
            <div>
              <dt className="text-[#9CA3AF]">IP</dt>
              <dd className="font-mono">{sanitizePlainText(selectedLog.ip, 64)}</dd>
            </div>
            <div>
              <dt className="text-[#9CA3AF]">Action</dt>
              <dd>{sanitizePlainText(selectedLog.action, 160)}</dd>
            </div>
            <div>
              <dt className="text-[#9CA3AF]">Disposition</dt>
              <dd>{sanitizePlainText(selectedLog.result, 64)}</dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      <ReportDrawer
        open={modal === "report"}
        onClose={() => setModal(null)}
        onExportPdf={exportReportPdf}
        onRerunScan={() => void rerunScanFromReport()}
        reportTimestamp={sanitizePlainText(reportTimestamp, 200)}
      />

      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`pointer-events-auto rounded-xl border px-4 py-2 text-sm shadow-xl ${
                toast.tone === "success"
                  ? "border-[#10B981]/30 bg-[#064E3B]/85 text-[#D1FAE5]"
                  : "border-[#3B82F6]/30 bg-[#1E3A8A]/80 text-[#DBEAFE]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {toast.tone === "success" ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                )}
                {toast.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

function BackgroundGlow() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0.25 }}
      animate={{ opacity: [0.2, 0.35, 0.2] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(59,130,246,0.18), transparent 30%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.12), transparent 30%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.08), transparent 35%)",
      }}
    />
  );
}
