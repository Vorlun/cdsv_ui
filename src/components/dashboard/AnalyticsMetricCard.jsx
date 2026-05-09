import { memo } from "react";
import { motion } from "motion/react";

export default memo(function AnalyticsMetricCard({ item, isLight }) {
  return (
    <article className={`rounded-2xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0F172A]/90"}`}>
      <p className={`text-xs uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#64748B]"}`}>{item.label}</p>
      <motion.p key={item.value} initial={{ opacity: 0.5, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xl font-semibold tabular-nums">
        {item.value}
      </motion.p>
      <div className={`mt-1.5 h-1.5 rounded-md ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
        <motion.div
          initial={false}
          animate={{ width: item.delta >= 0 ? "72%" : "48%" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-1.5 rounded-md ${item.delta >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
        />
      </div>
    </article>
  );
});

