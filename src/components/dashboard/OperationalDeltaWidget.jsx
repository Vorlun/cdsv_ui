import { memo } from "react";
import { Activity, RadioTower, ShieldAlert } from "lucide-react";

export default memo(function OperationalDeltaWidget({ delta, latestEvent, isLight, semanticMetrics, metrics }) {
  const isAlert = latestEvent?.severity === "critical" || latestEvent?.severity === "high";
  const latestLabel = latestEvent?.message ?? latestEvent?.type ?? "Zero-trust validation passed";
  return (
    <aside className={`rounded-xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1c33]"}`}>
      <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#87a2c4]"}`}>Relay Operations</p>
      <p className="mt-1 text-2xl font-semibold text-emerald-300">{metrics.telecomStability}%</p>
      <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#87a2c4]"}`}>telecom network stability</p>
      <div className="mt-2 grid gap-1.5 text-[11px]">
        <p className={isLight ? "text-slate-600" : "text-[#b5c6dc]"}>Edge latency: <span className="font-semibold text-sky-300">{semanticMetrics.edgeLatencyMs}ms</span></p>
        <p className={isLight ? "text-slate-600" : "text-[#b5c6dc]"}>Cloud relay health: <span className="font-semibold text-emerald-300">{semanticMetrics.cloudRelayHealth}%</span></p>
        <p className={isLight ? "text-slate-600" : "text-[#b5c6dc]"}>New validated events: <span className="font-semibold text-cyan-300">+{delta}</span></p>
      </div>
      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] ${isLight ? "text-slate-600" : "text-[#b5c6dc]"}`}>
        <RadioTower className="h-3.5 w-3.5" />
        FTTH edge relay synchronized
      </div>
      {latestEvent ? (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${isAlert ? "border-rose-400/30 bg-rose-500/10 text-rose-300" : "border-sky-400/30 bg-sky-500/10 text-sky-300"}`}>
          {isAlert ? <ShieldAlert className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          {latestLabel}
        </div>
      ) : null}
    </aside>
  );
});

