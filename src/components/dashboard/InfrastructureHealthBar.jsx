import { memo } from "react";
import { motion } from "motion/react";

function tone(value) {
  if (value >= 90) return "bg-emerald-500";
  if (value >= 75) return "bg-amber-500";
  return "bg-rose-500";
}

export default memo(function InfrastructureHealthBar({ value, isLight }) {
  return (
    <div className={`h-1.5 rounded-md ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
      <motion.div initial={false} animate={{ width: `${value}%` }} transition={{ duration: 0.35, ease: "easeOut" }} className={`h-1.5 rounded-md ${tone(value)}`} />
    </div>
  );
});

