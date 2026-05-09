import { memo } from "react";
import InfrastructureHealthBar from "./InfrastructureHealthBar";

export default memo(function ReadinessMetricCard({ metric, isLight }) {
  const primary = metric.importance === "primary";
  return (
    <article className={`rounded-xl border ${primary ? "p-3" : "p-2.5"} ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1727] shadow-[inset_0_1px_0_rgba(148,163,184,0.06)]"}`}>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className={isLight ? "text-slate-600" : "text-[#a8bdd8]"}>{metric.label}</span>
        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"}`}>
          {metric.profileTag}
        </span>
      </div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-[#7f94b1]"}`}>{metric.telemetrySource}</span>
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
          <span className={`h-1.5 w-1.5 rounded-full ${metric.syncState === "synced" ? "bg-emerald-400" : metric.syncState === "monitoring" ? "bg-amber-400" : "bg-rose-400"} ${metric.syncState === "synced" ? "animate-pulse" : ""}`} />
          {metric.value}%
        </span>
      </div>
      <InfrastructureHealthBar value={metric.value} isLight={isLight} />
      <div className={`mt-1 flex items-center justify-between text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
        <span className="inline-flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${metric.syncState === "synced" ? "bg-emerald-400" : metric.syncState === "monitoring" ? "bg-amber-400" : "bg-rose-400"}`} />
          {metric.syncState}
        </span>
        <span>{Math.round(metric.latencyMs)}ms</span>
      </div>
      <div className={`mt-0.5 flex items-center justify-between text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
        <span>{metric.delta >= 0 ? `+${metric.delta}%` : `${metric.delta}%`}</span>
        <span>{metric.throughput} tps</span>
      </div>
      <div className={`mt-0.5 flex items-center justify-between text-[10px] ${isLight ? "text-slate-500" : "text-[#7f94b1]"}`}>
        <span>trust {metric.trend === "up" ? "stable" : "watch"}</span>
        <span>{new Date(metric.updatedAt).toLocaleTimeString("en-GB", { hour12: false })}</span>
      </div>
    </article>
  );
});

