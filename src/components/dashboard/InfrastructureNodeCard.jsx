import { memo, useMemo } from "react";

function buildSparkline(seed, pattern) {
  return Array.from({ length: 18 }, (_, i) => {
    const base = pattern === "vault" ? 72 : pattern === "telemetry" ? 58 : pattern === "threat" ? 46 : 62;
    const wave = pattern === "gateway"
      ? Math.sin((seed + i) * 0.58) * 15 + (i % 6 === 0 ? 12 : 0)
      : pattern === "vault"
        ? Math.sin((seed + i) * 0.28) * 4
        : pattern === "telemetry"
          ? Math.sin((seed + i) * 0.72) * 11 + Math.cos((seed + i) * 0.22) * 7
          : Math.sin((seed + i) * 0.45) * 8 + (i % 9 === 0 ? 18 : 0);
    return Math.max(10, Math.min(94, base + wave));
  });
}

function patternFor(node) {
  const key = `${node.key ?? ""} ${node.label ?? ""}`.toLowerCase();
  if (key.includes("gateway") || key.includes("api")) return "gateway";
  if (key.includes("vault") || key.includes("encrypt")) return "vault";
  if (key.includes("telemetry") || key.includes("sync")) return "telemetry";
  if (key.includes("threat") || key.includes("scan")) return "threat";
  return "gateway";
}

export default memo(function InfrastructureNodeCard({ node, isLight, idx }) {
  const pattern = patternFor(node);
  const series = useMemo(() => buildSparkline(idx + node.uptime, pattern), [idx, node.uptime, pattern]);
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 100},${100 - v}`).join(" ");
  const statusTone = node.secureTunnelStatus === "watch" ? "text-amber-300" : "text-emerald-300";
  return (
    <article className={`group relative flex min-h-[188px] flex-col rounded-2xl border p-3.5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1a2d] hover:border-sky-400/20 hover:shadow-[0_0_24px_-14px_rgba(56,189,248,0.28)]"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>{node.label}</p>
          <p className={`mt-0.5 text-[10px] ${isLight ? "text-slate-400" : "text-[#6f86a5]"}`}>{node.nodeTag} · {node.classification}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {node.status}
        </span>
      </div>
      <p className={`truncate text-xs ${isLight ? "text-slate-700" : "text-[#d6e2f0]"}`}>{node.channel || node.detail}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <p className={isLight ? "text-slate-600" : "text-[#a8bdd8]"}>uptime <span className="font-semibold text-emerald-300">{node.uptime}%</span></p>
        <p className={isLight ? "text-slate-600" : "text-[#a8bdd8]"}>latency <span className="font-semibold text-sky-300">{node.latency}ms</span></p>
        <p className={isLight ? "text-slate-600" : "text-[#a8bdd8]"}>inspection <span className="font-semibold text-violet-300">{node.packetInspection}%</span></p>
        <p className={isLight ? "text-slate-600" : "text-[#a8bdd8]"}>heartbeat <span className="font-semibold text-cyan-300">{node.relayHeartbeat}%</span></p>
      </div>
      <div className={`mt-2 flex items-center justify-between rounded-lg border px-2 py-1 text-[10px] ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#071427]"}`}>
        <span className={isLight ? "text-slate-500" : "text-[#7f93ad]"}>secure tunnel</span>
        <span className={`font-semibold ${statusTone}`}>{node.secureTunnelStatus}</span>
      </div>
      <div className="mt-auto pt-2">
        <svg viewBox="0 0 100 100" className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
          <polygon points={`0,100 ${points} 100,100`} fill="rgba(56,189,248,0.08)" />
          <polyline points={points} fill="none" stroke="rgba(56,189,248,0.92)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </article>
  );
});

