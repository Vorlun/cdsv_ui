import { memo } from "react";
import { motion } from "motion/react";

export default memo(function SignalMetricsPanel({ metrics, semanticMetrics, isLight }) {
  const rowCls = isLight ? "text-slate-600" : "text-[#a8bdd8]";
  const panelCls = isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#07172c]";
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${panelCls}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Telecom Signal Assurance</p>
      <motion.p key={semanticMetrics.encryptedTrafficRate} initial={{ opacity: 0.55, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mt-1 text-4xl font-semibold tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}>
        {semanticMetrics.encryptedTrafficRate}%
      </motion.p>
      <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>encrypted traffic coverage</p>
      <div className={`mt-3 h-2 rounded-md ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
        <motion.div initial={false} animate={{ width: `${metrics.load}%` }} transition={{ duration: 0.35, ease: "easeOut" }} className="h-2 rounded-md bg-gradient-to-r from-cyan-400 to-emerald-400" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
        <p className={rowCls}>Secure API throughput: <span className="font-semibold text-sky-300">{semanticMetrics.secureApiThroughput} req/min</span></p>
        <p className={rowCls}>Packet integrity score: <span className="font-semibold text-emerald-300">{semanticMetrics.packetIntegrityScore}%</span></p>
        <p className={rowCls}>Active secure channels: <span className="font-semibold text-cyan-300">{semanticMetrics.activeSecureChannels}</span></p>
        <p className={rowCls}>Traffic inspection rate: <span className="font-semibold text-violet-300">{semanticMetrics.trafficInspectionRate}%</span></p>
      </div>
    </div>
  );
});

