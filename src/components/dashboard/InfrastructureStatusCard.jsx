import { memo, useMemo } from "react";

function miniSparkline(seed) {
  return Array.from({ length: 12 }, (_, i) => Math.max(10, Math.min(90, 45 + Math.sin((seed + i) * 0.7) * 24)));
}

export default memo(function InfrastructureStatusCard({ node, isLight, index }) {
  const series = useMemo(() => miniSparkline(index + 1), [index]);
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 100},${100 - v}`).join(" ");

  return (
    <article
      className={`group relative flex h-full min-h-[162px] flex-col rounded-2xl border p-4 transition ${
        isLight
          ? "border-slate-200 bg-white hover:shadow-md"
          : "border-white/10 bg-[#0b1a2d] hover:border-sky-400/25 hover:shadow-[0_0_28px_-16px_rgba(56,189,248,0.35)]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>{node.label}</p>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {node.status}
        </span>
      </div>
      <p className={`text-sm ${isLight ? "text-slate-700" : "text-[#d6e2f0]"}`}>{node.detail}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className={isLight ? "text-slate-500" : "text-[#8ea4c2]"}>Uptime</p>
          <p className="font-semibold text-emerald-300">{98 - (index % 3)}.{index} %</p>
        </div>
        <div>
          <p className={isLight ? "text-slate-500" : "text-[#8ea4c2]"}>Latency</p>
          <p className="font-semibold text-sky-300">{18 + index * 3} ms</p>
        </div>
      </div>
      <div className="mt-auto pt-2">
        <svg viewBox="0 0 100 100" className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
          <polyline points={points} fill="none" stroke="rgba(56,189,248,0.95)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </article>
  );
});

