import { memo } from "react";
import { motion } from "motion/react";

export default memo(function SignalMetrics({ metrics, isLight }) {
  return (
    <div className="min-w-0">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Signal volume</p>
      <motion.p
        key={metrics.volume}
        initial={{ opacity: 0.5, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-1 text-4xl font-semibold tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}
      >
        {metrics.volume}
      </motion.p>
      <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>signals in active window</p>
      <div className={`mt-3 h-2 rounded-md ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
        <motion.div
          initial={false}
          animate={{ width: `${metrics.load}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="h-2 rounded-md bg-sky-400"
        />
      </div>
    </div>
  );
});

