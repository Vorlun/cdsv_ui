import { memo } from "react";
import { EmptyStateCompact } from "./EmptyStates";

function StatusRow({ label, value, tone, hint, isLight }) {
  const hues = {
    safe: isLight ? "text-emerald-700" : "text-emerald-400",
    blocked: isLight ? "text-red-700" : "text-red-400",
    pending: isLight ? "text-amber-700" : "text-amber-400",
  };
  const textClass = hues[tone] ?? hues.pending;

  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${textClass}`}>{label}</span>
      <span className="flex flex-col items-end">
        <span className={`text-lg font-bold tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}>{value}</span>
        {hint ? <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-[#64748b]"}`}>{hint}</span> : null}
      </span>
    </li>
  );
}

export default memo(function StatusSummary({ fileStatus, blockedRatioPct, isLight }) {
  const cardBase = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const totalTracked = fileStatus.safe + fileStatus.blocked + fileStatus.pending;

  return (
    <section className={`${cardBase} p-5 transition duration-300 hover:shadow-[0_0_32px_-14px_rgba(16,185,129,0.12)] hover:-translate-y-0.5`}>
      <h3 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>File status summary</h3>
      <p className={`mt-1 text-xs ${muted}`}>Rolling posture across vault triage queues (demo counts).</p>
      {totalTracked ? (
        <ul className="mt-4 space-y-3">
          <StatusRow label="SAFE" value={fileStatus.safe} tone="safe" isLight={isLight} />
          <StatusRow label="BLOCKED" value={fileStatus.blocked} tone="blocked" isLight={isLight} hint={`${blockedRatioPct}% of corpus`} />
          <StatusRow label="PENDING" value={fileStatus.pending} tone="pending" isLight={isLight} />
        </ul>
      ) : (
        <EmptyStateCompact isLight={isLight} />
      )}
    </section>
  );
});
