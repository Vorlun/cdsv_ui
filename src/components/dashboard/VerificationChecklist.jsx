import { memo } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";

export default memo(function VerificationChecklist({ checks, isLight }) {
  return (
    <div className={`rounded-2xl border p-2.5 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0c1b2d]"}`}>
      <ul className="space-y-1.5">
        {checks.map((item) => (
          <li key={item.id} className={`rounded-xl border px-2.5 py-1.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1727]"}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex min-w-0 items-start gap-2 text-sm">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.verified ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="min-w-0">
                  <span className={isLight ? "text-slate-700" : "text-slate-200"}>{item.label}</span>
                  <span className={`mt-0.5 block text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
                    {item.node} · {item.zone} · {item.source}
                  </span>
                </span>
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.badge === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {item.chip}
                </span>
                <span className={`text-[9px] font-semibold uppercase ${item.badge === "verified" ? "text-emerald-300" : "text-amber-300"}`}>
                  {item.badge}
                </span>
              </div>
            </div>
            <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
              <Clock3 className="h-3 w-3" />
              <span>{new Date(item.checkedAt).toLocaleTimeString("en-GB", { hour12: false })}</span>
              <span>latency {item.syncLatencyMs}ms</span>
              <span>confidence {item.confidence}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

