import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cloud, Loader2, Lock, MonitorSmartphone, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { env } from "@/config/env";
import { ApiError } from "@/services/api/apiError";
import { getSocSecurityStatus } from "@/services/api";
import SocUserPageShell from "@/components/soc/SocUserPageShell";

const INITIAL_SECURITY = {
  device: 96,
  frontend: 91,
  backend: 94,
  encryption: 99,
  cloud: 92,
};

const METRIC_META = [
  { key: "device", title: "User Device", icon: MonitorSmartphone, pass: "Device scan passed" },
  { key: "frontend", title: "Frontend", icon: Activity, pass: "Frontend integrity verified" },
  { key: "backend", title: "Backend", icon: Server, pass: "Backend healthy" },
  { key: "encryption", title: "Encryption", icon: Lock, pass: "Encryption verified" },
  { key: "cloud", title: "Cloud", icon: Cloud, pass: "Cloud policy check passed" },
];

function scoreStatus(score) {
  if (score >= 90) return "Secure";
  if (score >= 70) return "Warning";
  return "Risk";
}

function statusTone(status) {
  if (status === "Secure") return "green";
  if (status === "Warning") return "yellow";
  return "red";
}

function fmtClock(ms) {
  return new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
}

function clampScore(n) {
  return Math.max(45, Math.min(100, Math.round(n)));
}

export default function UserSecurityPage() {
  const [scores, setScores] = useState(INITIAL_SECURITY);
  const [scoresLoadError, setScoresLoadError] = useState(/** @type {string | null} */ (null));
  const [scoresLoading, setScoresLoading] = useState(!env.useMockApi);

  const [lastChecks, setLastChecks] = useState(() => {
    const now = Date.now();
    return Object.fromEntries(METRIC_META.map((m) => [m.key, now]));
  });
  const [activityLog, setActivityLog] = useState(() => [
    `[${fmtClock(Date.now())}] ✔ Device scan passed`,
    `[${fmtClock(Date.now())}] ✔ Encryption verified`,
    `[${fmtClock(Date.now())}] ✔ Backend healthy`,
  ]);
  const [updatedKey, setUpdatedKey] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const timerRef = useRef(null);

  const overall = useMemo(() => {
    const values = Object.values(scores);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [scores]);

  const allSecure = Object.values(scores).every((v) => v >= 90);
  const hasDegradation = Object.values(scores).some((v) => v < 85);
  const overallThreat = allSecure ? "LOW" : "MODERATE RISK";
  const circumference = 2 * Math.PI * 54;
  const overallOffset = circumference * (1 - overall / 100);

  const pullSecurityStatus = useCallback(async () => {
    if (env.useMockApi) return;
    setScoresLoading(true);
    setScoresLoadError(null);
    try {
      const next = await getSocSecurityStatus();
      setScores(next);
      const now = Date.now();
      setLastChecks(Object.fromEntries(METRIC_META.map((m) => [m.key, now])));
      setActivityLog((prev) => [`[${fmtClock(now)}] ✔ Posture refreshed from control plane`, ...prev].slice(0, 8));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Security status request failed.";
      setScoresLoadError(msg);
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (env.useMockApi) return;
    void pullSecurityStatus();
  }, [pullSecurityStatus]);

  useEffect(() => {
    if (env.useMockApi) return;
    const id = window.setInterval(() => void pullSecurityStatus(), 28_000);
    return () => window.clearInterval(id);
  }, [pullSecurityStatus]);

  useEffect(() => {
    if (!env.useMockApi) return;

    let mounted = true;

    const tick = () => {
      const waitMs = 3000 + Math.floor(Math.random() * 2000);
      timerRef.current = window.setTimeout(() => {
        if (!mounted) return;

        const pick = METRIC_META[Math.floor(Math.random() * METRIC_META.length)];
        const delta = Math.floor(Math.random() * 7) - 3;

        setScores((prev) => {
          const next = { ...prev, [pick.key]: clampScore(prev[pick.key] + delta) };
          return next;
        });

        const checkedAtMs = Date.now();
        setUpdatedKey(pick.key);
        window.setTimeout(() => setUpdatedKey(null), 900);

        const verb = Math.random() > 0.25 ? pick.pass : `${pick.title} integrity OK`;
        setLastChecks((prev) => ({ ...prev, [pick.key]: checkedAtMs }));
        setActivityLog((prev) => [`[${fmtClock(checkedAtMs)}] ✔ ${verb}`, ...prev].slice(0, 8));
        tick();
      }, waitMs);
    };

    tick();
    return () => {
      mounted = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const showMetrics = env.useMockApi || (!scoresLoading && !scoresLoadError);

  return (
    <SocUserPageShell
      title="Security Status"
      subtitle="Layered posture telemetry for device, edge, control plane, and cloud policy. Mock mode simulates drift; live mode polls GET /security-status."
      badge={
        <div className="flex flex-wrap items-center gap-2">
          {env.useMockApi ? (
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
              Simulated
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              Control plane
            </span>
          )}
          {!env.useMockApi ? (
            <button
              type="button"
              onClick={() => void pullSecurityStatus()}
              disabled={scoresLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-sky-500/40 disabled:opacity-45"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scoresLoading ? "animate-spin" : ""}`} aria-hidden />
              Sync
            </button>
          ) : null}
        </div>
      }
    >
      {scoresLoadError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
        >
          <p className="font-medium text-white">Could not load security posture</p>
          <p className="mt-1 opacity-95">{scoresLoadError}</p>
          <button
            type="button"
            onClick={() => void pullSecurityStatus()}
            className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!env.useMockApi && scoresLoading && !scoresLoadError ? (
        <div
          className="flex min-h-[120px] items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#111827] px-4 py-8 text-sm text-slate-300"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-sky-400" aria-hidden />
          Fetching posture from backend…
        </div>
      ) : null}

      {showMetrics ? (
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Threat level: {overallThreat}</p>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-[#0B1220] px-4 py-3">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" aria-hidden>
                <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="10" />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke={allSecure ? "#10B981" : "#F59E0B"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={overallOffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{overall}%</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">overall</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Global Security Score</p>
              <p className="mt-1 text-xl font-semibold text-white">OVERALL SECURITY SCORE: {overall}%</p>
              <p className={`mt-1 text-xs font-medium ${allSecure ? "text-emerald-300" : "text-amber-300"}`}>
                Overall posture: {allSecure ? "Secure" : "Moderate Risk"}
              </p>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {showMetrics && hasDegradation ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Minor security degradation detected on one or more layers — review the lowest scores below.
        </div>
      ) : null}

      {showMetrics ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {METRIC_META.map((metric) => {
          const score = scores[metric.key];
          const status = scoreStatus(score);
          const tone = statusTone(status);
          const Icon = metric.icon;

          return (
            <div
              key={metric.key}
              title="Security score based on integrity checks"
              className={`rounded-2xl border bg-[#0F172A] p-5 shadow-lg transition-all duration-300 ${
                updatedKey === metric.key
                  ? "scale-[1.02] border-sky-500/55 shadow-[0_0_36px_-12px_rgba(56,189,248,0.55)]"
                  : "border-white/10"
              } hover:-translate-y-0.5 hover:border-sky-500/35 hover:shadow-[0_14px_40px_-24px_rgba(56,189,248,0.35)]`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <Icon className="h-5 w-5 text-slate-200" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{metric.title}</p>
                    <p className="text-xs text-slate-400">
                      Last check: {fmtClock(lastChecks[metric.key])} • {Math.max(0, Math.floor((nowTick - lastChecks[metric.key]) / 1000))}{" "}
                      sec ago
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    tone === "green"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : tone === "yellow"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-lg font-semibold text-white">{score}%</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/50">
                <div
                  className={`h-full transition-all duration-700 ease-out ${
                    tone === "green" ? "bg-emerald-500" : tone === "yellow" ? "bg-amber-500" : "bg-red-500"
                  } ${updatedKey === metric.key ? "shadow-[0_0_20px_-6px_rgba(56,189,248,0.65)]" : ""}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      ) : null}

      {showMetrics ? (
      <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sky-400" />
          <h3 className="text-lg font-semibold text-white">Recent checks</h3>
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-700/50 bg-[#0B1220] p-3 text-sm font-mono text-slate-300">
          {activityLog.length === 0 ? (
            <p className="text-slate-500">No telemetry yet.</p>
          ) : (
            activityLog.map((line, idx) => (
              <p key={`${line}-${idx}`} className="rounded-md border border-slate-700/50 bg-slate-900/40 px-3 py-2">
                {line}
              </p>
            ))
          )}
          {!env.useMockApi ? (
            <p className="pl-1 text-sky-300/85">
              <span className="inline-block h-4 w-2 animate-pulse bg-sky-300/70 align-middle" />
              <span className="sr-only"> Live sync idle</span>
            </p>
          ) : (
            <p className="pl-1 text-sky-300/85">
              <span className="inline-block h-4 w-2 animate-pulse bg-sky-300/70 align-middle" />
              <span className="sr-only"> Simulated ingest</span>
            </p>
          )}
        </div>
      </div>
      ) : null}
    </SocUserPageShell>
  );
}
