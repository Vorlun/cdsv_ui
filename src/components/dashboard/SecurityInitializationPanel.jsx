import { memo } from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import VerificationChecklist from "./VerificationChecklist";
import ReadinessMetricCard from "./ReadinessMetricCard";
import TelemetryStatusBadge from "./TelemetryStatusBadge";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { useInfrastructureHealth } from "@/hooks/useInfrastructureHealth";
import { useRealtimeReadiness } from "@/hooks/useRealtimeReadiness";

export default memo(function SecurityInitializationPanel({ isLight, baselineMetrics, telemetrySyncAt, monitoringNodesOnline, telemetryEvents = [] }) {
  const verificationStatus = useVerificationStatus(telemetryEvents, telemetrySyncAt, monitoringNodesOnline);
  const healthMetrics = useInfrastructureHealth(baselineMetrics, telemetryEvents);
  const readiness = useRealtimeReadiness(healthMetrics, verificationStatus);

  return (
    <section className={`rounded-3xl border p-4 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1628] bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[length:100%_26px]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Telecom security readiness</h3>
          <p className={`mt-0.5 text-xs ${isLight ? "text-slate-500" : "text-[#9CA3AF]"}`}>Zero-trust relay, encrypted traffic and cloud vault verification center.</p>
        </div>
        <div className="flex items-center gap-2">
          <TelemetryStatusBadge status={verificationStatus.telemetryHeartbeat} />
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            readiness.state === "ready" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : "border-amber-500/35 bg-amber-500/10 text-amber-300"
          }`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            readiness {readiness.readinessScore}%
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-2">
          <VerificationChecklist checks={verificationStatus.checks} isLight={isLight} />
          <div className={`grid gap-2 rounded-xl border px-3 py-2 text-[11px] sm:grid-cols-3 ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-[#0b1727] text-[#9db3cf]"}`}>
            <span>verification {new Date(verificationStatus.lastVerificationAt).toLocaleTimeString("en-GB", { hour12: false })}</span>
            <span>nodes {verificationStatus.activeNodes}/5</span>
            <span className="font-semibold text-emerald-300">sync {verificationStatus.infrastructureSync}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {healthMetrics.slice(0, 4).map((metric) => (
              <ReadinessMetricCard key={metric.key} metric={metric} isLight={isLight} />
            ))}
          </div>
          {healthMetrics.slice(4, 5).map((metric) => (
            <ReadinessMetricCard key={metric.key} metric={metric} isLight={isLight} />
          ))}
          <div className={`rounded-xl border px-3 py-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0b1727]"}`}>
            <div className={`mb-1 flex items-center justify-between text-[11px] ${isLight ? "text-slate-600" : "text-[#a8bdd8]"}`}>
              <span>encrypted relay channel activity</span>
              <span className="font-semibold text-emerald-300">{verificationStatus.infrastructureSync}% stable</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <p className={isLight ? "text-slate-500" : "text-[#8ea4c2]"}>telemetry heartbeat: {verificationStatus.telemetryHeartbeat}</p>
              <p className={isLight ? "text-slate-500" : "text-[#8ea4c2]"}>FTTH/cloud node refresh: {verificationStatus.activeNodes}/5</p>
            </div>
          </div>
        </div>
      </div>
      <div className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        <span>Last cloud relay sync: {new Date(telemetrySyncAt).toLocaleTimeString("en-GB", { hour12: false })}</span>
        <span>monitoring nodes online: {monitoringNodesOnline}</span>
        <span className="text-emerald-300">SECURE-LINK active</span>
      </div>
    </section>
  );
});

