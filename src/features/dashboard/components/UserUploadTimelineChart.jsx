import { memo, useMemo } from "react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sanitizePlainText } from "@/utils/sanitize";

function normalizeTimelineRows(data) {
  if (!Array.isArray(data)) return [];
  return data.map((row, i) => {
    const label = row?.label ?? row?.day ?? `Day ${i + 1}`;
    const raw = Number(row?.uploads);
    const uploads = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return { label: String(label), uploads };
  });
}

/**
 * Upload volume by day — Recharts bars from baseline 0 upward, gradient fill, peak highlight.
 * @param {{ data: Array<{ label?: string, day?: string, uploads: number }>, isLight?: boolean }} props
 */
export default memo(function UserUploadTimelineChart({ data, isLight = false }) {
  const rows = useMemo(() => normalizeTimelineRows(data), [data]);
  const maxUploads = useMemo(() => rows.reduce((m, d) => Math.max(m, d.uploads), 0), [rows]);
  const yAxisMax = useMemo(() => {
    const m = maxUploads;
    if (m <= 0) return 1;
    const padded = Math.ceil(m * 1.12);
    return Math.max(padded, m + 1);
  }, [maxUploads]);

  const grid = isLight ? "#E2E8F0" : "#1F2937";
  const axis = isLight ? "#64748B" : "#9CA3AF";
  const tooltipBg = isLight ? "#FFFFFF" : "#0F172A";
  const tooltipBorder = isLight ? "#CBD5E1" : "#374151";

  if (!rows.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={
        isLight
          ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          : "rounded-2xl border border-white/10 bg-[#111827] p-5"
      }
    >
      <div className="mb-4">
        <h3 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>
          Upload timeline (7 days)
        </h3>
        <p className={`mt-1 text-xs ${isLight ? "text-slate-500" : "text-[#9CA3AF]"}`}>
          Ingestion volume attributed to your workspace (mock telemetry).
        </p>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="userUploadGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="userUploadGradientPeak" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#0f766e" />
                <stop offset="55%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="label" stroke={axis} fontSize={12} tickLine={false} axisLine={{ stroke: grid }} />
            <YAxis
              type="number"
              stroke={axis}
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: grid }}
              domain={[0, yAxisMax]}
              allowDecimals={false}
              tickFormatter={(v) => String(Math.max(0, Math.round(Number(v))))}
            />
            <Tooltip
              cursor={{ fill: isLight ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.06)" }}
              formatter={(value) => {
                const n = Math.max(0, Math.round(Number(value)));
                return [`${n} upload${n === 1 ? "" : "s"}`, "Volume"];
              }}
              labelFormatter={(lab) => sanitizePlainText(String(lab ?? ""), 16)}
              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", fontSize: "12px" }}
            />
            <Bar
              dataKey="uploads"
              radius={[6, 6, 0, 0]}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              {rows.map((entry, index) => (
                <Cell
                  key={`upload-bar-${entry.label}-${index}`}
                  fill={maxUploads > 0 && entry.uploads === maxUploads ? "url(#userUploadGradientPeak)" : "url(#userUploadGradient)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
});
