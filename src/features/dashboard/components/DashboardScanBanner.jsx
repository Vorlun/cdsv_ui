import { memo } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default memo(function DashboardScanBanner({
  scanState,
  scanStages,
  healthScoreStatic = 92,
  onViewReport,
}) {
  const showBanner = Boolean(scanState?.running || scanState?.result);
  if (!showBanner) return null;

  const currentStageIndex = scanState.running
    ? Math.min(
        scanStages.length - 1,
        Math.floor((scanState.progress / 100) * Math.max(scanStages.length, 1)),
      )
    : scanStages.length - 1;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#0F172A] p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>Orchestrator Security Scan</span>
        <span className="tabular-nums">{scanState.progress ?? 0}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[#10B981] transition-all duration-300"
          style={{ width: `${scanState.progress ?? 0}%` }}
          role="progressbar"
          aria-valuenow={scanState.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        {scanStages.map((stage, idx) => {
          const complete = scanState.running ? idx < currentStageIndex : Boolean(scanState.result);
          const active = scanState.running && idx === currentStageIndex;
          return (
            <div key={stage} className="flex items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  complete ? "bg-[#10B981]" : active ? "animate-pulse bg-[#3B82F6]" : "bg-white/20"
                }`}
              />
              <span className={complete ? "text-[#A7F3D0]" : active ? "text-[#BFDBFE]" : "text-[#9CA3AF]"}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
      {scanState.result ? (
        <div className="mt-4 rounded-xl border border-[#10B981]/20 bg-[#064E3B]/20 p-3">
          <p
            className={`flex items-center gap-2 text-sm ${
              scanState.threatDetected ? "text-[#FCD34D]" : "text-[#6EE7B7]"
            }`}
          >
            {scanState.threatDetected ? (
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {scanState.result}
          </p>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Medium alerts: <span className="tabular-nums">{scanState.mediumAlerts}</span>
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Blocked requests today:{" "}
            <span className="tabular-nums">{scanState.blockedToday}</span>
          </p>
          <button
            type="button"
            onClick={onViewReport}
            className="mt-3 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-1.5 text-xs text-[#BFDBFE] hover:bg-[#3B82F6]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]"
          >
            View Report
          </button>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2">
            <div className="relative h-12 w-12 shrink-0">
              <svg viewBox="0 0 36 36" className="h-12 w-12">
                <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#1F2937" strokeWidth="3" />
                <path
                  d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeDasharray={`${healthScoreStatic}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#A7F3D0]">
                {healthScoreStatic}
              </span>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">Security Health Score</p>
              <p className="text-sm font-semibold text-[#E5E7EB]">
                {healthScoreStatic}/100
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
