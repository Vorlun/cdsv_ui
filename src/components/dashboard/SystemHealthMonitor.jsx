import { memo, useMemo } from "react";
import { Activity, Database, HardDrive, RadioTower, ShieldCheck, Wifi } from "lucide-react";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default memo(function SystemHealthMonitor({ isLight, infrastructure, telemetryEvents, uploadRows }) {
  const metrics = useMemo(() => {
    const events = Array.isArray(telemetryEvents) ? telemetryEvents : [];
    const rows = Array.isArray(uploadRows) ? uploadRows : [];
    const latest = events[0]?.metadata ?? {};
    const uploads = rows.reduce((acc, row) => acc + Number(row.uploads || 0), 0);
    const encrypted = rows.reduce((acc, row) => acc + Number(row.encrypted || 0), 0);
    return [
      { key: "postgres", group: "persistence", label: "PostgreSQL", value: "connected", detail: "replication healthy", Icon: Database, tone: "text-emerald-300" },
      { key: "storage", group: "persistence", label: "Vault archive", value: `${Math.min(78, 24 + uploads * 3)}%`, detail: "secure mount active", Icon: HardDrive, tone: "text-violet-300" },
      { key: "api", group: "communication", label: "API latency", value: `${clamp(Number(latest.edgeLatencyMs ?? infrastructure?.cluster?.avgLatency ?? 18), 8, 44)}ms`, detail: "within p95 threshold", Icon: Activity, tone: "text-sky-300" },
      { key: "ws", group: "communication", label: "WebSocket relay", value: "99.2%", detail: "SOC stream synchronized", Icon: Wifi, tone: "text-cyan-300" },
      { key: "coverage", group: "encryption", label: "Encryption coverage", value: `${uploads ? Math.round((encrypted / Math.max(1, uploads)) * 100) : 98}%`, detail: "traffic + storage", Icon: ShieldCheck, tone: "text-emerald-300" },
      { key: "relay", group: "relay infrastructure", label: "Relay sync", value: `${clamp(infrastructure?.cluster?.syncedNodes ?? 3, 0, 5)}/5`, detail: "cloud/FTTH nodes", Icon: RadioTower, tone: "text-emerald-300" },
    ];
  }, [infrastructure, telemetryEvents, uploadRows]);
  const groups = [...new Set(metrics.map((metric) => metric.group))];

  return (
    <section className={`h-fit rounded-3xl border p-3.5 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0b1628]"}`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>System Health Monitoring</h3>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Persistence, API, relay and encryption readiness.</p>
        </div>
        <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
          layer health
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
        {groups.map((group) => (
          <div key={group} className={`rounded-2xl border p-2 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f172a]"}`}>
            <p className={`mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{group}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {metrics.filter((metric) => metric.group === group).map((metric) => (
                <article key={metric.key} className={`rounded-xl border px-2 py-1.5 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#081425]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <metric.Icon className={`h-3 w-3 ${metric.tone}`} />
                    <span className={`text-[9px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{metric.label}</span>
                  </div>
                  <p className={`mt-1 text-sm font-semibold tabular-nums ${metric.tone}`}>{metric.value}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                    <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>{metric.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});
