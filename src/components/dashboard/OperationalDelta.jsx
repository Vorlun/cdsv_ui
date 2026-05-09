import { memo } from "react";
import { Activity } from "lucide-react";

export default memo(function OperationalDelta({ delta, isLight, latestEvent }) {
  return (
    <aside className={`rounded-xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1c33]"}`}>
      <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#87a2c4]"}`}>Operational delta</p>
      <p className="mt-1 text-2xl font-semibold text-emerald-300">+{delta}</p>
      <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#87a2c4]"}`}>new events</p>
      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] ${isLight ? "text-slate-600" : "text-[#b5c6dc]"}`}>
        <Activity className="h-3.5 w-3.5" />
        Stable upward
      </div>
      {latestEvent ? (
        <p className={`mt-2 text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
          {latestEvent.type} · {latestEvent.severity}
        </p>
      ) : null}
    </aside>
  );
});

