import { memo } from "react";
import { motion } from "motion/react";
import { Loader2, Search, ShieldCheck, ShieldX } from "lucide-react";
import { sanitizePlainText } from "@/utils/sanitize";

function lifecycleStyles(lifecycle, dismissed, priority) {
  if (dismissed || priority === "low" || lifecycle === "closed") {
    return {
      badge: "bg-[#475569]/30 text-[#94A3B8] ring-1 ring-slate-600/35",
      dot: "bg-[#64748B]",
      row: "border-white/10",
    };
  }
  if (lifecycle === "mitigated") {
    return {
      badge: "bg-[#10B981]/20 text-[#6EE7B7] ring-1 ring-[#10B981]/35",
      dot: "bg-[#10B981]",
      row: "border-[#10B981]/25",
    };
  }
  if (lifecycle === "investigating") {
    return {
      badge: "bg-[#F59E0B]/20 text-[#FDE68A] ring-1 ring-[#F59E0B]/30",
      dot: "bg-[#F59E0B]",
      row: "border-[#F59E0B]/30",
    };
  }
  return {
    badge: "bg-[#EF4444]/20 text-[#FCA5A5] ring-1 ring-[#EF4444]/25",
    dot: "bg-[#EF4444]",
    row: "border-[#EF4444]/35",
  };
}

function severityClass(severity) {
  if (severity === "Critical") return "bg-[#EF4444]/20 text-[#FCA5A5]";
  if (severity === "High") return "bg-[#F97316]/20 text-[#FDBA74]";
  return "bg-[#F59E0B]/20 text-[#FDE68A]";
}

export default memo(function SoarIncidentCard({
  incident,
  eligibleAssignees = [],
  onInvestigate,
  onBlock,
  onIgnore,
  onAssignOwner,
  loadingInvestigate,
  loadingBlock,
  loadingIgnore,
  loadingAssign,
  gates,
}) {
  const st = lifecycleStyles(incident.lifecycle, incident.dismissed, incident.priority);
  const muted = incident.dismissed || incident.priority === "low" || incident.lifecycle === "closed";
  const critPulse = incident.severity === "Critical" && incident.lifecycle === "detected" && !muted;
  const slaHot = incident.slaBreached || incident.slaConsumedPercent >= 90;
  const openGates = gates == null;
  const socGates = gates ?? {};
  const canIr = openGates || Boolean(socGates.investigate);
  const canBlk = openGates || Boolean(socGates.block);
  const canIgn = openGates || Boolean(socGates.ignore);
  const canAsn = openGates || Boolean(socGates.assign);

  const handleAssignPick = (e) => {
    const v = e.target.value.trim();
    e.target.selectedIndex = 0;
    if (!v || muted || !canAsn) return;
    void onAssignOwner(incident.id, v);
  };

  return (
    <motion.div
      layout="position"
      whileHover={{ y: -4 }}
      className={`rounded-xl border bg-[#0F172A]/85 p-3 shadow-[0_0_14px_rgba(239,68,68,0.08)] transition duration-200 hover:shadow-[0_0_18px_rgba(239,68,68,0.16)] ${st.row} ${critPulse ? "animate-[pulse_2.8s_ease-in-out_infinite]" : ""} ${muted ? "opacity-70" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-[11px] uppercase tracking-wide text-[#94A3B8]" title={incident.id}>
          {sanitizePlainText(incident.id, 96)}
        </span>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${st.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {sanitizePlainText(String(incident.lifecycle ?? "").replace(/^./, (c) => c.toUpperCase()), 24)}
        </span>
      </div>

      {(incident.priority === "elevated" || incident.priority === "escalated") && !muted ? (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#FCA5A5]">
          Escalated · tier {sanitizePlainText(String(incident.escalationTier ?? 1), 4)}
        </div>
      ) : null}

      <div className="text-sm font-semibold text-white">{sanitizePlainText(incident.type, 120)}</div>
      {incident.playbookBanner ? (
        <div className="mt-1 border-l border-[#F97316]/50 pl-2 text-[10px] leading-snug text-[#FDBA74]">
          {sanitizePlainText(incident.playbookBanner, 280)}
        </div>
      ) : null}

      {incident.inInvestigationQueue ? (
        <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#BFDBFE]">Active SOC queue</div>
      ) : null}

      {incident.principal ? (
        <div className="mt-1 truncate text-[11px] text-[#C7D2FE]" title={sanitizePlainText(incident.principal, 254)}>
          Principal: <span className="font-medium">{sanitizePlainText(incident.principal, 254)}</span>
        </div>
      ) : null}

      <div className="mt-1 font-mono text-xs text-[#93C5FD]">{sanitizePlainText(incident.ip, 85)}</div>
      <div className="mt-1 text-xs text-[#9CA3AF]">
        Events: <span className="text-[#FDE68A]">{incident.attempts}</span> · Risk{" "}
        <span className="text-[#FDBA74]">{incident.riskScore}</span>
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="flex items-center justify-between text-[10px] text-[#64748B]">
          <span>SLA {sanitizePlainText(String(incident.minutesOpen ?? 0), 6)}m / goal {sanitizePlainText(String(incident.slaBudgetMinutes ?? 90), 4)}m</span>
          <span className={slaHot ? "text-[#FCA5A5]" : "text-[#94A3B8]"}>
            {sanitizePlainText(String(incident.slaConsumedPercent ?? 0), 4)}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-colors ${slaHot ? "bg-[#EF4444]" : "bg-gradient-to-r from-[#38BDF8] to-[#6366F1]"}`}
            style={{ width: `${Math.min(100, incident.slaConsumedPercent ?? 0)}%` }}
          />
        </div>
      </div>

      <div className="mt-1 truncate text-[11px] text-[#64748B]" title={sanitizePlainText(incident.geoLabel, 140)}>
        {sanitizePlainText(incident.geoLabel, 100)}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[#9CA3AF]">
        <span className={`rounded-full px-2 py-0.5 ${severityClass(incident.severity)}`}>
          {sanitizePlainText(incident.severity, 24)}
        </span>
        {incident.assignedToEmail ? (
          <span className="rounded-full border border-[#A78BFA]/35 bg-[#8B5CF6]/15 px-2 py-0.5 text-[#DDD6FE]">
            Owner: {sanitizePlainText(incident.assignedToEmail, 200)}
          </span>
        ) : (
          <span className="text-[#64748B]">Unassigned</span>
        )}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Assign SOC owner</span>
        <div className="flex items-center gap-2">
          <select
            disabled={muted || Boolean(loadingAssign) || !canAsn}
            defaultValue=""
            onChange={handleAssignPick}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0B1220] px-2 py-1.5 text-[11px] text-[#E5E7EB] outline-none focus:border-[#8B5CF6]/55 disabled:opacity-35"
          >
            <option value="">Delegate owner…</option>
            {(eligibleAssignees ?? []).map((person) => (
              <option key={person.email} value={sanitizePlainText(person.email, 254)}>
                {sanitizePlainText(person.name ?? person.email, 120)}
              </option>
            ))}
          </select>
          {loadingAssign ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#A78BFA]" /> : null}
        </div>
      </label>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={muted || incident.lifecycle === "mitigated" || !canIr}
          onClick={() => void onInvestigate(incident.id, incident.lifecycle)}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-1.5 text-[11px] text-[#BFDBFE] shadow-[0_0_12px_rgba(59,130,246,0.14)] transition hover:bg-[#3B82F6]/20 disabled:opacity-35"
        >
          {loadingInvestigate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          IR
        </button>
        <button
          type="button"
          disabled={muted || incident.lifecycle === "mitigated" || !canBlk}
          onClick={() => void onBlock(incident.id)}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1.5 text-[11px] text-[#FCA5A5] transition hover:bg-[#EF4444]/25 disabled:opacity-35"
        >
          {loadingBlock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Block
        </button>
        <button
          type="button"
          disabled={muted || !canIgn}
          onClick={() => void onIgnore(incident.id)}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-[#9CA3AF] transition hover:bg-white/10 disabled:opacity-35"
        >
          {loadingIgnore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
          Ignore
        </button>
      </div>
    </motion.div>
  );
});
