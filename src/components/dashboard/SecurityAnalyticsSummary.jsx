import { memo } from "react";
import { Activity } from "lucide-react";
import AnalyticsMetricCard from "./AnalyticsMetricCard";

export default memo(function SecurityAnalyticsSummary({ isLight, analytics, telemetryAgeSec }) {
  return (
    <section className={`rounded-3xl border p-3.5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1628]"}`}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Cloud telecom security analytics</h3>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Assurance signals derived from topology, relay and upload telemetry.</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/10 bg-white/[0.04] text-[#94A3B8]"}`}>
          <Activity className="h-3.5 w-3.5" aria-hidden />
          sync {telemetryAgeSec}s ago
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {analytics.map((item) => (
          <AnalyticsMetricCard key={item.key} item={item} isLight={isLight} />
        ))}
      </div>
    </section>
  );
});

