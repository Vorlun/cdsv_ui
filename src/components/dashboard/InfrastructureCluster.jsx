import { memo } from "react";
import InfrastructureNodeCard from "./InfrastructureNodeCard";

export default memo(function InfrastructureCluster({ isLight, data }) {
  const serviceGroups = [
    ["critical infra", "CORE"],
    ["relay services", "EDGE"],
    ["monitoring", "SOC"],
    ["validation", "VAULT"],
  ];
  return (
    <section className={`rounded-3xl border p-5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1628]"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold uppercase tracking-wide ${isLight ? "text-slate-700" : "text-[#cdd9e8]"}`}>Infrastructure Cluster</h3>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
            Avg uptime {data.cluster.avgUptime}% · avg latency {data.cluster.avgLatency}ms · synced nodes {data.cluster.syncedNodes}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {serviceGroups.map(([label, code]) => (
            <span key={code} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/[0.04] text-[#9db3cf]"}`}>
              {code} · {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            live
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.nodes.map((node, idx) => (
          <InfrastructureNodeCard key={node.key} node={node} idx={idx} isLight={isLight} />
        ))}
      </div>
    </section>
  );
});

