import { memo, useState } from "react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sanitizePlainText } from "@/utils/sanitize";

/** Heavy chart bundle — dynamically imported by the admin dashboard shell. */
export default memo(function DashboardChartsPanel({ chartData, threatDistribution }) {
  const [activeThreatSlice, setActiveThreatSlice] = useState(0);

  if (!chartData) return null;

  return (
    <>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-white/10 bg-[#111827] p-5 xl:col-span-2"
        >
          <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Login Attempts Over Time</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.loginAttempts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  formatter={(value) => [`${Number(value)} attempts`, "Login Attempts"]}
                  labelFormatter={(label) => sanitizePlainText(String(label ?? ""), 64)}
                  contentStyle={{ background: "#0F172A", border: "1px solid #374151" }}
                />
                <Line type="monotone" dataKey="attempts" stroke="#60A5FA" strokeWidth={3} dot={false} animationDuration={1100} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-white/10 bg-[#111827] p-5"
        >
          <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Threat Distribution</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={threatDistribution}
                    dataKey="percent"
                    innerRadius={48}
                    outerRadius={82}
                    startAngle={90}
                    endAngle={-270}
                    animationDuration={900}
                    onMouseEnter={(_, idx) => setActiveThreatSlice(idx)}
                  >
                    {(threatDistribution ?? []).map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke={idx === activeThreatSlice ? "#E5E7EB" : "transparent"}
                        strokeWidth={idx === activeThreatSlice ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, props) => {
                      const p = props?.payload;
                      return [
                        `${sanitizePlainText(String(value), 8)}% (${sanitizePlainText(String(p?.count), 12)})`,
                        sanitizePlainText(p?.name ?? "Category", 120),
                      ];
                    }}
                    contentStyle={{ background: "#0F172A", border: "1px solid #374151" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2">
              {(threatDistribution ?? []).map((item, idx) => (
                <div
                  key={item.name}
                  className={`rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs ${
                    idx === activeThreatSlice ? "ring-1 ring-[#3B82F6]/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[#E5E7EB]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{sanitizePlainText(item.name, 120)}</span>
                    </div>
                    <span className="shrink-0 text-[#9CA3AF]">
                      {item.percent}% ({item.count})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-white/10 bg-[#111827] p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E5E7EB]">Upload Activity vs Threat Events</h3>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Compare ingestion volume vs correlated incident counts (OSS-aligned view).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-[#BFDBFE]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
              Uploads
            </span>
            <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              Threat Events
            </span>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.uploadsThreats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #374151" }} />
              <Bar dataKey="uploads" fill="#3B82F6" radius={[6, 6, 0, 0]} animationDuration={800} />
              <Bar dataKey="threats" fill="#EF4444" radius={[6, 6, 0, 0]} animationDuration={850} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>
    </>
  );
});
