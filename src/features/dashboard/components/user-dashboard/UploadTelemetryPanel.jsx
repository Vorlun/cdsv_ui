import { memo, useMemo } from "react";
import { motion } from "motion/react";
import TelemetryAreaChart from "./TelemetryAreaChart";
import TelemetryMetricChip from "./TelemetryMetricChip";
import { useUploadMetrics } from "@/hooks/useUploadMetrics";

function TelemetryMatrixCell({ label, value, detail, tone = "text-cyan-300", isLight }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#081425]"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[9px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{label}</span>
        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${tone.replace("text-", "bg-")}`} />
      </div>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className={`mt-0.5 truncate text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>{detail}</p>
    </div>
  );
}

export default memo(function UploadTelemetryPanel({ rows, hasSignal, connected, lastSyncAt, isLight = false }) {
  const metrics = useUploadMetrics(rows, lastSyncAt);
  const statusLabel = connected ? "sync: online" : "sync: degraded";
  const statusTone = connected ? "text-emerald-300 border-emerald-400/25 bg-emerald-500/10" : "text-amber-300 border-amber-400/25 bg-amber-500/10";
  const telemetryDeltaLabel = useMemo(
    () => `${metrics.uploadsPerMinute} upm · secure rate ${metrics.secureRate}%`,
    [metrics.uploadsPerMinute, metrics.secureRate],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={
        isLight
          ? "min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          : "min-w-0 rounded-3xl border border-white/10 bg-[#0a1527] p-4 shadow-[0_20px_60px_-36px_rgba(56,189,248,0.35)]"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Upload telemetry</h3>
          <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-[#9CA3AF]"}`}>Realtime secure ingestion and file assurance pipeline.</p>
          <p className={`mt-1 text-[11px] ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            {telemetryDeltaLabel} · {metrics.ingestionNode} · {metrics.channelState} · refresh {metrics.freshnessLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
          <TelemetryMetricChip label="uploads" value={metrics.uploads} tone="blue" delta={metrics.delta} isLight={isLight} />
          <TelemetryMetricChip label="encrypted" value={metrics.encrypted} tone="cyan" isLight={isLight} />
          <TelemetryMetricChip label="verified" value={metrics.verified} tone="green" isLight={isLight} />
          <TelemetryMetricChip label="relay" value={`${metrics.relaySyncConfidence}%`} tone="cyan" isLight={isLight} />
          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${isLight ? "border-slate-200 text-slate-600" : statusTone}`}>
            {statusLabel} · {metrics.pipelineState}
          </span>
        </div>
      </div>

      {hasSignal ? (
        <>
          <TelemetryAreaChart rows={rows} isLight={isLight} />
          <div className={`mt-3 rounded-xl border p-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0F172A]"}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>ingestion diagnostics</span>
              <span className="text-[10px] font-semibold text-emerald-300">VAULT-SYNCED</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
              <TelemetryMatrixCell label="throughput" value={`${metrics.uploadsPerMinute}/min`} detail="encrypted upload waves" tone="text-sky-300" isLight={isLight} />
              <TelemetryMatrixCell label="scan latency" value={`${metrics.scanLatencyMs}ms`} detail={`${metrics.scanned} malware cycles`} tone="text-amber-300" isLight={isLight} />
              <TelemetryMatrixCell label="integrity" value={`${metrics.secureRate}%`} detail={`${metrics.verified} SHA-256 checks`} tone="text-emerald-300" isLight={isLight} />
              <TelemetryMatrixCell label="quarantine" value={metrics.quarantineCount} detail="inspection queue" tone="text-rose-300" isLight={isLight} />
              <TelemetryMatrixCell label="relay sync" value={`${metrics.relaySyncConfidence}%`} detail="EDGE-UPLINK confidence" tone="text-cyan-300" isLight={isLight} />
            </div>
          </div>
        </>
      ) : (
        <div
          className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border text-center ${
            isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-[#0F172A] text-[#94A3B8]"
          }`}
        >
          <p className="text-sm font-semibold">Awaiting secure upload telemetry</p>
          <p className="mt-1 text-xs">Ingestion pipeline operational</p>
          <p className="mt-1 text-xs opacity-80">No recent upload activity detected</p>
        </div>
      )}
    </motion.section>
  );
});
