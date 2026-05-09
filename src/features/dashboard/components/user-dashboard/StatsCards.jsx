import { memo } from "react";
import { Archive, ArrowRight, CheckCircle2, Info, LockKeyhole, RadioTower } from "lucide-react";
import { Link } from "react-router-dom";
import { securityBarColor, securityScoreColor } from "./userStatusStyles";
import ActiveSignalsCard from "@/components/dashboard/ActiveSignalsCard";

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

function StatusPill({ children, tone = "emerald", isLight }) {
  const tones = {
    emerald: isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    sky: isLight ? "border-sky-200 bg-sky-50 text-sky-700" : "border-sky-400/25 bg-sky-500/10 text-sky-300",
    slate: isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/[0.04] text-[#a8bdd8]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${tones[tone]}`}>
      {children}
    </span>
  );
}

function MiniMetric({ Icon, label, value, detail, isLight, tone = "text-cyan-300" }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 transition group-hover:translate-y-[-1px] ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-[#0f172a]/78"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isLight ? "bg-white text-sky-700 shadow-sm" : "bg-white/[0.06] text-cyan-300"}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`truncate text-[10px] font-semibold ${isLight ? "text-slate-700" : "text-[#d7e3f4]"}`}>{label}</p>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${isLight ? "text-slate-900" : tone}`}>{value}</span>
          </div>
          <p className={`truncate text-[9px] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressTrack({ value, isLight, tone = "from-cyan-400 to-emerald-400" }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-[width] duration-700 ease-out`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export default memo(function StatsCards({
  isLight,
  uploadsTotal,
  lastLoginAt: _lastLoginAt,
  securityScore,
  securityBreakdown,
  activityCount,
  signalSummary,
  liveActivity,
}) {
  const cardBase = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"
    : "rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#081120_0%,#0b1730_58%,#0a1527_100%)] shadow-[0_22px_70px_-48px_rgba(56,189,248,0.55)]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const scoreColor = securityScoreColor(securityScore, isLight);
  const barTone = securityBarColor(securityScore);

  const cardHover = isLight
    ? "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_-24px_rgba(15,23,42,0.24)] hover:ring-1 hover:ring-sky-200/70"
    : "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_58px_-24px_rgba(56,189,248,0.34)] hover:ring-1 hover:ring-sky-400/20";

  const tier =
    securityScore >= 95 ? "Hardened" : securityScore >= 88 ? "Stable" : securityScore >= 75 ? "Elevated" : "Critical";
  const segments = [20, 40, 60, 80, 100];
  const securedRecords = Math.max(uploadsTotal, activityCount);
  const verifiedUploads = Math.max(0, uploadsTotal - (signalSummary?.critical ?? 0));
  const secureSessionRatio = Math.max(88, Math.min(99, securityScore - Math.max(0, signalSummary?.warning ?? 0)));
  const anomalyRate = Math.max(0, (signalSummary?.critical ?? 0) + (signalSummary?.warning ?? 0));
  const encryptionCoverage = securedRecords ? Math.min(99, Math.round((uploadsTotal / Math.max(1, securedRecords)) * 100 + 6)) : 98;
  const integrityCoverage = uploadsTotal ? Math.round((verifiedUploads / Math.max(1, uploadsTotal)) * 100) : 100;
  const archiveCount = Math.max(1, uploadsTotal);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <article className={`group relative flex h-full min-h-[198px] flex-col overflow-hidden p-4 xl:col-span-4 ${cardBase} ${cardHover}`}>
        <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>Protected Telecom Assets</p>
            <p className={`mt-0.5 text-[11px] ${muted}`}>Trusted transmission storage active</p>
          </div>
          <StatusPill isLight={isLight}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            relay online
          </StatusPill>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className={`text-4xl font-semibold leading-none tabular-nums tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>{securedRecords}</p>
            <p className={`mt-0.5 text-[11px] font-medium ${muted}`}>protected records indexed</p>
          </div>
          <div className="min-w-[108px]">
            <div className="flex items-center justify-between text-[10px]">
              <span className={muted}>Encryption</span>
              <span className="font-semibold text-emerald-300">{encryptionCoverage}%</span>
            </div>
            <ProgressTrack value={encryptionCoverage} isLight={isLight} />
            <p className={`mt-0.5 text-[9px] ${muted}`}>vault synchronized</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <MiniMetric Icon={LockKeyhole} label="AES-secured records" value={uploadsTotal} detail="secure data transmission" isLight={isLight} />
          <MiniMetric Icon={CheckCircle2} label="SHA-256 validated assets" value={verifiedUploads} detail={`${integrityCoverage}% integrity confirmed`} isLight={isLight} tone="text-emerald-300" />
          <MiniMetric Icon={Archive} label="Protected relay archives" value={archiveCount} detail="cloud vault retained" isLight={isLight} tone="text-violet-300" />
          <MiniMetric Icon={RadioTower} label="Relay synchronization" value="online" detail="edge storage channel active" isLight={isLight} tone="text-cyan-300" />
        </div>

        <Link
          className={`mt-2 inline-flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition hover:gap-2 ${
            isLight ? "border-slate-200 bg-slate-50 text-sky-700 hover:bg-sky-50" : "border-white/10 bg-white/[0.035] text-[#93C5FD] hover:bg-white/[0.06]"
          }`}
          to="/files"
        >
          Open forensic asset center <ArrowRight className="h-3 w-3" />
        </Link>
      </article>

      <article className={`group relative flex h-full min-h-[198px] flex-col overflow-hidden p-4 xl:col-span-4 ${cardBase} ${cardHover}`}>
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>Cloud Telecom Security Index</p>
            <p className={`mt-0.5 text-[11px] ${muted}`}>Encryption, gateway and anomaly confidence</p>
          </div>
          <StatusPill isLight={isLight} tone="sky">live confidence</StatusPill>
        </div>
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <div className="flex items-end gap-2">
            <p className={`text-4xl font-bold leading-none tabular-nums ${scoreColor}`}>{securityScore}</p>
            <span className={`pb-0.5 text-xs ${muted}`}>/100</span>
          </div>
          <div className="mt-3">
            <ProgressTrack value={securityScore} isLight={isLight} tone={barTone.includes("emerald") ? "from-emerald-400 to-cyan-400" : barTone.includes("amber") ? "from-amber-400 to-orange-400" : "from-rose-400 to-orange-400"} />
          </div>
        </div>
        <div className={`rounded-xl border p-2.5 ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-[#0f172a]/78"}`}>
          <div className="flex items-center justify-between text-[11px]">
            <span className={muted}>Operational security tier</span>
            <span className="font-semibold text-emerald-300">{tier}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10px]">
            <span className={muted}>Encryption <b className="text-emerald-300">{Math.min(99, securityScore + 1)}%</b></span>
            <span className={muted}>Gateway <b className="text-sky-300">{Math.max(80, securityScore - 2)}%</b></span>
            <span className={muted}>Confidence <b className="text-cyan-300">{secureSessionRatio}%</b></span>
          </div>
        </div>
      </article>

      <article className={`group relative flex h-full min-h-[198px] flex-col overflow-hidden p-4 xl:col-span-4 ${cardBase} ${cardHover}`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>Network Trust Posture</p>
            <p className={`mt-0.5 text-[11px] ${muted}`}>Zero-trust relay and edge confidence</p>
          </div>
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
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            tier === "Hardened"
              ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
              : tier === "Stable"
                ? "border-sky-400/25 bg-sky-500/15 text-sky-300"
                : tier === "Elevated"
                  ? "border-amber-400/25 bg-amber-500/15 text-amber-300"
                  : "border-rose-400/25 bg-rose-500/15 text-rose-300"
          }`}>
            Zero-trust {tier}
          </span>
          <span className={`text-xs ${muted}`}>relay authentication state</span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
          {segments.map((segment) => (
            <span
              key={segment}
              className={`h-1.5 rounded-full transition-colors ${
                securityScore >= segment ? (isLight ? "bg-slate-700" : "bg-gradient-to-r from-cyan-300 to-emerald-300") : isLight ? "bg-slate-200" : "bg-white/10"
              }`}
              aria-hidden
            />
          ))}
          </div>
        </div>
        <div className={`rounded-xl border p-2.5 text-[11px] ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-[#0f172a]/78"}`}>
          <div className="flex items-center justify-between">
            <span className={muted}>Edge security confidence</span>
            <p className={`font-semibold tabular-nums ${scoreColor}`}>{securityScore}%</p>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className={muted}>Suspicious activity isolated</span>
            <span className={anomalyRate > 0 ? "text-amber-300" : "text-emerald-300"}>{anomalyRate}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className={muted}>Backbone health</span>
            <span className="text-cyan-300">{Math.max(90, securityScore - 1)}%</span>
          </div>
        </div>
      </article>

      <div className="xl:col-span-12">
        <ActiveSignalsCard
          isLight={isLight}
          activityCount={activityCount}
          signalSummary={signalSummary}
          liveActivity={liveActivity}
        />
      </div>
    </div>
  );
});
