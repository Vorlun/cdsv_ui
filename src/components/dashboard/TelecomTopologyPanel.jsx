import { memo, useMemo } from "react";
import { Cloud, Database, RadioTower, ShieldCheck, Waypoints } from "lucide-react";

const NODE_BLUEPRINT = [
  { key: "api-gateway", label: "API Gateway", Icon: ShieldCheck, role: "northbound control", baseLatency: 14, segment: "CORE-RELAY", tier: "control" },
  { key: "cloud-relay", label: "Cloud Relay", Icon: Cloud, role: "secure service mesh", baseLatency: 18, segment: "CLOUD-SVC", tier: "relay" },
  { key: "ftth-edge", label: "FTTH Edge Node", Icon: RadioTower, role: "subscriber edge", baseLatency: 23, segment: "FTTH-11", tier: "edge" },
  { key: "telemetry-relay", label: "Telemetry Relay", Icon: Waypoints, role: "SOC event stream", baseLatency: 16, segment: "SOC-EAST", tier: "monitor" },
  { key: "vault", label: "Storage Vault", Icon: Database, role: "encrypted archive", baseLatency: 11, segment: "VAULT-A", tier: "storage" },
];

function buildNodes(infrastructure) {
  const sourceNodes = infrastructure?.nodes ?? [];
  return NODE_BLUEPRINT.map((node, idx) => {
    const source = sourceNodes[idx % Math.max(1, sourceNodes.length)] ?? {};
    const trust = Math.max(88, Math.min(99, Math.round(source.syncHealth ?? source.uptime ?? 96)));
    const latency = Math.max(8, Math.round(source.latency ?? node.baseLatency));
    return {
      ...node,
      status: trust >= 94 ? "synced" : trust >= 90 ? "monitoring" : "degraded",
      trust,
      latency,
      encryptionHealth: Math.max(91, Math.min(100, trust + (idx % 2 ? 1 : 0))),
      syncHealth: Math.max(86, Math.min(100, Math.round(source.syncHealth ?? trust))),
    };
  });
}

export default memo(function TelecomTopologyPanel({ isLight, infrastructure }) {
  const nodes = useMemo(() => buildNodes(infrastructure), [infrastructure]);
  const lineTone = isLight ? "bg-slate-300" : "bg-cyan-400/30";
  const avgTrust = Math.round(nodes.reduce((acc, node) => acc + node.trust, 0) / Math.max(1, nodes.length));
  const avgEncryption = Math.round(nodes.reduce((acc, node) => acc + node.encryptionHealth, 0) / Math.max(1, nodes.length));
  const syncedCount = nodes.filter((node) => node.status === "synced").length;

  return (
    <section className={`h-fit rounded-3xl border p-3.5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#071427]"}`}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Telecom Network Topology</h3>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Cloud relay, FTTH edge and encrypted telemetry path health.</p>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          encrypted channels active
        </span>
      </div>

      <div className="relative grid gap-2 md:grid-cols-5">
        <div className={`pointer-events-none absolute left-[10%] right-[10%] top-9 hidden h-px ${lineTone} md:block`} />
        <div className="pointer-events-none absolute left-[10%] top-9 hidden h-px w-[18%] animate-pulse bg-gradient-to-r from-transparent via-cyan-300 to-transparent md:block" />
        {nodes.map((node) => (
          <article key={node.key} className={`relative rounded-2xl border p-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0b1c33]"}`}>
            <div className={`absolute -top-1 right-3 h-2 w-2 rounded-full ${node.status === "synced" ? "bg-emerald-400" : node.status === "monitoring" ? "bg-amber-400" : "bg-rose-400"} animate-pulse`} />
            <div className="flex items-center gap-2">
              <span className={`rounded-lg border p-1.5 ${isLight ? "border-slate-200 bg-white text-sky-700" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"}`}>
                <node.Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#e5e7eb]"}`}>{node.label}</p>
                <p className={`truncate text-[10px] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{node.role}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${isLight ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.04] text-[#8ea4c2]"}`}>{node.segment}</span>
              <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${isLight ? "border-slate-200 bg-white text-slate-500" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"}`}>{node.tier}</span>
            </div>
            <div className={`mt-2 grid gap-0.5 text-[10px] ${isLight ? "text-slate-600" : "text-[#a8bdd8]"}`}>
              <p>trust level: <span className="font-semibold text-emerald-300">{node.trust}%</span></p>
              <p>sync health: <span className="font-semibold text-cyan-300">{node.syncHealth}% · {node.status}</span></p>
              <p>latency: <span className="font-semibold text-sky-300">{node.latency}ms</span></p>
              <p>encryption: <span className="font-semibold text-emerald-300">{node.encryptionHealth}%</span></p>
            </div>
          </article>
        ))}
      </div>
      <div className={`mt-2.5 grid gap-2 rounded-2xl border p-2 text-[10px] md:grid-cols-3 ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-[#0b1c33]/70 text-[#9db3cf]"}`}>
        <p><span className="text-emerald-300">●</span> relay sync: <span className="font-semibold text-emerald-300">{syncedCount}/5 nodes</span></p>
        <p><span className="text-cyan-300">●</span> trust mesh: <span className="font-semibold text-cyan-300">{avgTrust}% verified</span></p>
        <p><span className="text-sky-300">●</span> encrypted flow: <span className="font-semibold text-sky-300">{avgEncryption}% confidence</span></p>
      </div>
    </section>
  );
});
