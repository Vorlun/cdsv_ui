import { memo, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import TelemetryStreamChart from "./TelemetryStreamChart";
import SignalMetricsPanel from "./SignalMetricsPanel";
import OperationalDeltaWidget from "./OperationalDeltaWidget";
import SeverityIndicators from "./SeverityIndicators";
import { useSignalMetrics } from "@/hooks/useSignalMetrics";
import { useRealtimeTelemetry } from "@/hooks/useRealtimeTelemetry";

function scrollToRecentActivity(ev) {
  ev.preventDefault();
  document.getElementById("recent-activity")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default memo(function ActiveSignalsCard({ isLight, activityCount, signalSummary, liveActivity }) {
  const { latest, chartStream, semanticMetrics } = useRealtimeTelemetry();
  const metrics = useSignalMetrics(activityCount, signalSummary, liveActivity);
  const jump = useCallback(scrollToRecentActivity, []);

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border p-4 md:p-5 ${
        isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#071427] shadow-[0_18px_56px_-30px_rgba(56,189,248,0.35)]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Active Telecom Security Signals</p>
          <p className={`mt-1 text-xs ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>Encrypted traffic, edge relay integrity and cloud vault telemetry</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
          SOC feed live
        </span>
      </div>

      <div className="grid items-stretch gap-3 xl:grid-cols-[260px_minmax(0,1fr)_230px]">
        <SignalMetricsPanel metrics={metrics} semanticMetrics={semanticMetrics} isLight={isLight} />
        <TelemetryStreamChart stream={chartStream} isLight={isLight} latestEvent={latest} />
        <OperationalDeltaWidget delta={metrics.delta} isLight={isLight} latestEvent={latest} semanticMetrics={semanticMetrics} metrics={metrics} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <SeverityIndicators metrics={metrics} suspicious={semanticMetrics.suspiciousActivity} />
        <button
          type="button"
          onClick={jump}
          className={`inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2 ${
            isLight ? "text-sky-700" : "text-sky-300"
          }`}
        >
          Inspect event timeline <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
});

