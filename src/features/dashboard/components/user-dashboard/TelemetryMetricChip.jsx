import { memo } from "react";

export default memo(function TelemetryMetricChip({ label, value, tone = "blue", delta = null, isLight = false }) {
  const toneClasses = {
    blue: isLight ? "text-sky-700 border-sky-200 bg-sky-50" : "text-sky-300 border-sky-400/25 bg-sky-500/10",
    cyan: isLight ? "text-cyan-700 border-cyan-200 bg-cyan-50" : "text-cyan-300 border-cyan-400/25 bg-cyan-500/10",
    green: isLight ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-emerald-300 border-emerald-400/25 bg-emerald-500/10",
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[tone] || toneClasses.blue}`}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      <span className="opacity-90">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      {typeof delta === "number" ? (
        <span className={`tabular-nums ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {delta >= 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </div>
  );
});
