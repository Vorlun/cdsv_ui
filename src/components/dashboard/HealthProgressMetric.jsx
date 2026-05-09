import { memo } from "react";
import { motion } from "motion/react";

function tone(value) {
  if (value >= 90) return "bg-emerald-500";
  if (value >= 75) return "bg-amber-500";
  return "bg-rose-500";
}

export default memo(function HealthProgressMetric({ metric, isLight }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={isLight ? "text-slate-600" : "text-slate-300"}>{metric.label}</span>
        <span className="font-semibold tabular-nums">{metric.value}%</span>
      </div>
      <div className={`h-2 rounded-md ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
        <motion.div initial={false} animate={{ width: `${metric.value}%` }} transition={{ duration: 0.45, ease: "easeOut" }} className={`h-2 rounded-md ${tone(metric.value)}`} />
      </div>
    </div>
  );
});

