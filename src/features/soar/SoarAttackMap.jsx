import { memo, useMemo } from "react";
import { motion } from "motion/react";
import { sanitizePlainText } from "@/utils/sanitize";

function severityStroke(sev) {
  if (sev === "Critical") return "#EF4444";
  if (sev === "High") return "#F97316";
  if (sev === "Medium") return "#F59E0B";
  return "#38BDF8";
}

export default memo(function SoarAttackMap({ mapPoints = [], streamEpoch = 0 }) {
  const arcs = useMemo(() => {
    const pts = mapPoints.slice(0, 8);
    const out = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = Math.min(a.y, b.y) - 6 + (i % 3) * 2;
      out.push({
        id: `${a.id}-${b.id}-${streamEpoch}-${i}`,
        d: `M${a.x} ${a.y} Q ${mx} ${my}, ${b.x} ${b.y}`,
        stroke: severityStroke(a.severity),
      });
    }
    return out;
  }, [mapPoints, streamEpoch]);

  return (
    <div className="relative h-[290px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#111827]">
      <svg viewBox="0 0 100 70" className="h-full w-full">
        <defs>
          <radialGradient id="soarMapGlow" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="70" fill="url(#soarMapGlow)" />

        {arcs.map((arc) => (
          <motion.path
            key={arc.id}
            d={arc.d}
            stroke={arc.stroke}
            strokeWidth="0.45"
            fill="none"
            strokeDasharray="2 3"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.35, 0.9, 0.45], strokeDashoffset: [10, 0] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {mapPoints.slice(0, 14).map((node, idx) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.severity === "Critical" ? 2.2 : 1.5}
              fill={severityStroke(node.severity)}
              animate={{ r: [1.4, 2.6, 1.55], opacity: [0.7, 1, 0.75] }}
              transition={{ duration: 1.9 + idx * 0.08 + (Number(node.pulse) % 10) * 0.02, repeat: Infinity }}
            />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={8}
              fill="transparent"
              stroke={severityStroke(node.severity)}
              strokeWidth={0.25}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.45, 0.18], scale: [0.92, 1.08, 0.94] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: idx * 0.05 }}
            />
            <title>{sanitizePlainText(`${node.label} · ${node.severity}`, 240)}</title>
            <text x={node.x + 2.2} y={node.y - 2} fill="#94A3B8" fontSize="2.05">
              {sanitizePlainText(node.label.split(",")[0] ?? node.label, 18)}
            </text>
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-2 py-1 text-[10px] text-[#A5F3FC]">
        Live ingest · shard {sanitizePlainText(String(streamEpoch ?? 0), 8)}
      </div>
    </div>
  );
});
