import { memo, useCallback } from "react";
import { Activity as ActivityIcon, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAbsolute, formatRelativeShort } from "./formatters";
import { securityBarColor, securityScoreColor } from "./userStatusStyles";

function scrollToRecentActivity(ev) {
  ev.preventDefault();
  document.getElementById("recent-activity")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SecurityBreakdownPanel({ breakdown, isLight }) {
  if (!breakdown) return null;

  const labelCls = isLight ? "text-slate-900" : "text-[#e5e7eb]";
  const subCls = isLight ? "text-slate-500" : "text-[#64748b]";
  const pos = isLight ? "text-emerald-700" : "text-emerald-400";
  const neg = isLight ? "text-red-700" : "text-red-400";

  return (
    <div
      role="tooltip"
      className={`absolute bottom-full left-0 z-30 mb-2 w-[260px] origin-bottom rounded-xl border px-3 py-2.5 text-left opacity-0 shadow-xl transition-all duration-200 group-hover/breakdown:opacity-100 group-focus-within/breakdown:opacity-100 ${
        isLight ? "border-slate-200 bg-white shadow-slate-200/40" : "border-white/10 bg-[#0f172a] shadow-black/40"
      }`}
    >
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${subCls}`}>Score breakdown</p>
      <ul className="space-y-1.5 text-xs">
        {breakdown.positives.map((row) => (
          <li key={row.label} className={`flex flex-col gap-0.5 ${labelCls}`}>
            <span className={pos}>
              + {row.label} · +{row.points} pts
            </span>
            <span className={`text-[10px] ${subCls}`}>{row.detail}</span>
          </li>
        ))}
        {breakdown.negatives.map((row) => (
          <li key={row.label} className={`flex flex-col gap-0.5 ${labelCls}`}>
            <span className={neg}>
              − {row.label} · {row.points} pts
            </span>
            <span className={`text-[10px] ${subCls}`}>{row.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(function StatsCards({
  isLight,
  uploadsTotal,
  lastLoginAt,
  securityScore,
  securityBreakdown,
  activityCount,
}) {
  const cardBase = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const scoreColor = securityScoreColor(securityScore, isLight);
  const barTone = securityBarColor(securityScore);

  const cardHover = isLight
    ? "transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.2)] hover:ring-1 hover:ring-sky-200/60"
    : "transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_-12px_rgba(56,189,248,0.25)] hover:ring-1 hover:ring-sky-500/20";

  const jump = useCallback(scrollToRecentActivity, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={`group p-5 ${cardBase} ${cardHover}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Lifetime uploads</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{uploadsTotal}</p>
        <Link
          className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold transition hover:gap-2 ${isLight ? "text-sky-700" : "text-[#93C5FD]"}`}
          to="/files"
        >
          Browse files <ArrowRight className="h-3 w-3" />
        </Link>
      </article>

      <article className={`group p-5 ${cardBase} ${cardHover}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Last login</p>
        <p className="mt-2 text-lg font-semibold">{formatAbsolute(lastLoginAt)}</p>
        <p className={`mt-1 text-xs ${muted}`}>{formatRelativeShort(lastLoginAt)}</p>
      </article>

      <article className={`group relative p-5 ${cardBase} ${cardHover}`}>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Workspace security score</p>
          <span
            className={`group/breakdown relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg outline-none ring-sky-500/0 transition focus-visible:ring-2 ${
              isLight ? "bg-slate-100 text-slate-500" : "bg-white/[0.06] text-[#94a3b8]"
            }`}
            tabIndex={0}
            aria-label="Score breakdown"
          >
            <Info className="h-4 w-4 transition duration-300 group-hover/breakdown:scale-110" aria-hidden />
            <SecurityBreakdownPanel breakdown={securityBreakdown} isLight={isLight} />
          </span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{securityScore}</p>
          <span className={`pb-1 text-sm ${muted}`}>/100</span>
        </div>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
          <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${barTone}`} style={{ width: `${securityScore}%` }} />
        </div>
      </article>

      <article className={`group p-5 ${cardBase} ${cardHover}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Recent signals</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-2xl font-semibold tabular-nums">{activityCount}</p>
          <ActivityIcon className={`h-9 w-9 transition duration-300 group-hover:scale-110 ${muted}`} aria-hidden />
        </div>
        <button
          type="button"
          onClick={jump}
          className={`mt-2 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-xs font-semibold transition hover:gap-2 ${
            isLight ? "text-sky-700" : "text-[#93C5FD]"
          }`}
        >
          Jump to activity <ArrowRight className="h-3 w-3" />
        </button>
      </article>
    </div>
  );
});
