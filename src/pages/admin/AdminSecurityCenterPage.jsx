import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  KeyRound,
  Lock,
  Minus,
  Radar,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Vault,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { formatBytes } from "@/features/admin-upload-monitoring/uploadMonitoringUtils";

const SecurityControlDrawer = lazy(() => import("@/features/security-center/SecurityControlDrawer.jsx"));

const POLL_MS = 28_000;
const WS_DEBOUNCE_MS = 520;

function humanPlatformHealth(label) {
  const map = { Excellent: "Healthy", Stable: "Stable", Warning: "Warning", Critical: "Critical", Offline: "Offline" };
  return map[label] ?? label ?? "—";
}

function scoreAccent(score) {
  const s = Number(score) || 0;
  if (s >= 90) return "#34d399";
  if (s >= 74) return "#22d3ee";
  if (s >= 52) return "#fbbf24";
  return "#fb7185";
}

const ScoreRing = memo(function ScoreRing({ score, healthLabel, trend }) {
  const safe = Math.min(100, Math.max(0, Number(score) || 0));
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - safe / 100);
  const color = scoreAccent(safe);
  const tr = Number(trend) || 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[134px] w-[134px]">
        <svg className="h-[134px] w-[134px] -rotate-90" viewBox="0 0 124 124">
          <circle cx="62" cy="62" r={r} fill="none" stroke="#ffffff08" strokeWidth="9" />
          <motion.circle
            cx="62"
            cy="62"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span key={safe} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold tabular-nums text-white">
            {safe}
          </motion.span>
          <span className="text-[10px] text-slate-500">/ 100</span>
        </div>
      </div>
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{humanPlatformHealth(healthLabel)}</p>
      <div className="flex items-center gap-1 text-[10px] tabular-nums">
        {tr > 0 ? (
          <>
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">+{tr}</span>
          </>
        ) : tr < 0 ? (
          <>
            <ArrowDownRight className="h-3 w-3 text-rose-400" />
            <span className="text-rose-400">{tr}</span>
          </>
        ) : (
          <>
            <Minus className="h-3 w-3 text-slate-600" />
            <span className="text-slate-600">0</span>
          </>
        )}
        <span className="text-slate-600">Δ sync</span>
      </div>
    </div>
  );
});

const MiniSpark = memo(function MiniSpark({ title, values = [], color = "#22d3ee" }) {
  const data = useMemo(() => values.map((v, i) => ({ i, v: Number(v) || 0 })), [values]);
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/25 px-2 py-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="h-[44px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const CONTROL_ACCENTS = {
  active: "border-emerald-500/20 hover:border-emerald-400/35",
  degraded: "border-amber-500/25 hover:border-amber-400/40",
  failed: "border-rose-500/30 hover:border-rose-400/45",
  syncing: "border-sky-500/25 hover:border-sky-400/40",
  warning: "border-amber-500/28 hover:border-amber-400/42",
};

export default function AdminSecurityCenterPage() {
  const [overview, setOverview] = useState(null);
  const [authMetrics, setAuthMetrics] = useState(null);
  const [encryption, setEncryption] = useState(null);
  const [controls, setControls] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, id: null });

  const timerRef = useRef(null);
  const wsTimerRef = useRef(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [ov, auth, enc, ctrls, evts] = await Promise.all([
        socApi.securityOverview(),
        socApi.securityAuthMetrics(),
        socApi.securityEncryption(),
        socApi.securityControls(),
        socApi.securityEvents(48),
      ]);
      setOverview(ov);
      setAuthMetrics(auth);
      setEncryption(enc);
      setControls(ctrls);
      setEvents(evts);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll(false);
    timerRef.current = setInterval(() => void fetchAll(true), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  const scheduleWs = useCallback(() => {
    if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
    wsTimerRef.current = setTimeout(() => {
      wsTimerRef.current = null;
      void fetchAll(true);
    }, WS_DEBOUNCE_MS);
  }, [fetchAll]);

  useEffect(() => {
    const unsub = subscribeSocStream((ev) => {
      const t = String(ev?.type ?? "").toLowerCase();
      const ch = String(ev?._channel ?? "");
      if (
        ch === "overview" ||
        t.includes("security") ||
        t.includes("auth") ||
        t.includes("session") ||
        t.includes("encrypt") ||
        t.includes("threat")
      ) {
        scheduleWs();
      }
    });
    return () => {
      unsub();
      if (wsTimerRef.current) clearTimeout(wsTimerRef.current);
    };
  }, [scheduleWs]);

  const pieData = useMemo(() => {
    const segs = encryption?.segments ?? [];
    return segs.map((s) => ({ name: s.label, value: s.count, fill: s.color, percent: s.percent }));
  }, [encryption]);

  const platformHealth = overview?.platformHealth ?? "Offline";
  const healthPulse =
    platformHealth === "Warning" || platformHealth === "Critical" ? "animate-[pulse_3s_ease-in-out_infinite]" : "";

  const metaChips = useMemo(() => {
    const chips = [];
    if (overview?.meta?.criticalArtifacts != null) {
      chips.push({ label: "Critical artifacts", value: overview.meta.criticalArtifacts, tone: "text-rose-300" });
    }
    if (overview?.meta?.quarantinedArtifacts != null) {
      chips.push({ label: "Quarantined", value: overview.meta.quarantinedArtifacts, tone: "text-amber-300" });
    }
    if (authMetrics?.mfaEnabledUsers != null) {
      chips.push({ label: "MFA enrolled", value: authMetrics.mfaEnabledUsers, tone: "text-cyan-300" });
    }
    const vr = overview?.meta?.verificationRatio;
    if (vr != null) chips.push({ label: "Verification plane", value: `${vr}%`, tone: "text-emerald-300" });
    return chips;
  }, [overview, authMetrics]);

  return (
    <div className="min-h-full space-y-4 bg-[#050810] p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">Security Center</h1>
            {pulse ? (
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                Live
              </span>
            ) : null}
            <span
              className={`rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 ${healthPulse}`}
            >
              Posture · {humanPlatformHealth(platformHealth)}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
            Zero-trust governance console — aggregates vault telemetry, auth plane, encryption posture, and middleware health from PostgreSQL + SOC streams.
          </p>
          {metaChips.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {metaChips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px]"
                >
                  <Radar className={`h-3.5 w-3.5 ${c.tone}`} />
                  <span className="text-slate-500">{c.label}</span>
                  <span className={`font-mono font-semibold ${c.tone}`}>{c.value}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void fetchAll(false)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync
        </button>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {overview?.offline ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Database unreachable — security aggregates paused. JWT and encryption middleware remain enforced at runtime.
        </div>
      ) : null}

      {/* Score strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { key: "securityScore", label: "Security Score", Icon: Shield },
          { key: "forensicHealth", label: "Forensic Health", Icon: ShieldCheck },
          { key: "authIntegrity", label: "Auth Integrity", Icon: KeyRound },
          { key: "vaultSync", label: "Vault Sync", Icon: Vault },
        ].map(({ key, label, Icon }) => (
          <motion.div
            key={key}
            layout
            className={`rounded-2xl border border-white/[0.07] bg-[#0c121d]/95 p-4 shadow-inner shadow-black/40 ${
              platformHealth === "Critical" || platformHealth === "Warning"
                ? "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
                : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Icon className="h-4 w-4 text-cyan-400/80" />
              <span className="text-[10px] uppercase tracking-wide text-slate-600">{label}</span>
            </div>
            <ScoreRing
              score={overview?.scores?.[key] ?? 0}
              healthLabel={overview?.labels?.[key] ?? "Offline"}
              trend={overview?.trends?.[key] ?? 0}
            />
          </motion.div>
        ))}
      </div>

      {/* Hero analytics + controls */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch">
        <section className="rounded-2xl border border-white/[0.07] bg-[#0c121d]/95 p-4 shadow-inner shadow-black/50 xl:col-span-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Encryption distribution</h2>
              <p className="text-[11px] text-slate-600">
                Vault ciphertext mix · {encryption?.totalFiles ?? "—"} artifacts · {formatBytes(encryption?.totalBytesEncrypted ?? 0)} AES-class payload
              </p>
            </div>
            <span className="font-mono text-[10px] text-slate-600">{encryption?.syncedAt?.slice(11, 19) ?? ""}</span>
          </div>
          {pieData.length ? (
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-6">
              <div className="relative mx-auto h-[min(52vw,280px)] w-[min(92vw,280px)] shrink-0 lg:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="52%"
                      outerRadius="78%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, _n, props) => {
                        const p = props?.payload;
                        return [`${value} files (${p?.percent ?? "—"}%)`, p?.name ?? ""];
                      }}
                      contentStyle={{
                        background: "#0b1220",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <Sparkles className="mb-1 h-5 w-5 text-cyan-400/70" />
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Encrypted volume</span>
                  <span className="font-mono text-lg font-bold text-white">{formatBytes(encryption?.totalBytesEncrypted ?? 0)}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.fill }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{d.name}</p>
                      <p className="text-[11px] text-slate-500">{d.value} objects · {d.percent}%</p>
                    </div>
                  </div>
                ))}
                {(encryption?.protocolHints ?? []).map((h) => (
                  <div key={h.label} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs">
                    <span className="text-slate-400">{h.label}</span>
                    <span className="font-mono text-slate-200">{h.value}{typeof h.value === "number" ? "%" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-600">No vault ciphertext indexed yet.</div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#0c121d]/95 p-4 shadow-inner shadow-black/50 xl:col-span-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Security controls</h2>
          <div className="grid max-h-[min(68vh,560px)] gap-2 overflow-y-auto pr-1 md:grid-cols-1">
            {(controls?.controls ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setDrawer({ open: true, id: c.id })}
                className={`flex w-full items-start gap-3 rounded-xl border bg-black/25 px-3 py-3 text-left transition hover:bg-white/[0.04] ${CONTROL_ACCENTS[c.state] ?? CONTROL_ACCENTS.active}`}
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{c.title}</span>
                    <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
                      {c.state}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{c.detail}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Auth observability */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0c121d]/95 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Authentication metrics · 24h</h2>
          <p className="text-[10px] text-slate-600">{authMetrics?.hints?.jwtProxyNote ?? ""}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Successful logins", value: authMetrics?.successfulLogins24h ?? "—", color: "text-emerald-400" },
            { label: "Failed attempts", value: authMetrics?.failedAttempts24h ?? "—", color: "text-rose-400" },
            { label: "Active sessions", value: authMetrics?.activeSessions ?? "—", color: "text-cyan-400" },
            { label: "Sessions opened", value: authMetrics?.jwtIssuedProxy24h ?? "—", color: "text-violet-400" },
            { label: "RBAC signals", value: authMetrics?.rbacViolations24h ?? "—", color: "text-amber-400" },
            { label: "MFA enrolled", value: authMetrics?.mfaEnabledUsers ?? "—", color: "text-sky-400" },
            { label: "Suspicious auth", value: authMetrics?.suspiciousAuthAttempts24h ?? "—", color: "text-orange-400" },
            { label: "Revoked / churn", value: authMetrics?.revokedTokens24h ?? "—", color: "text-fuchsia-400" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-center">
              <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MiniSpark title="Failed login trend" values={authMetrics?.sparklines?.failedLogins ?? []} color="#fb7185" />
          <MiniSpark title="Session issuance" values={authMetrics?.sparklines?.tokenIssuance ?? []} color="#a78bfa" />
          <MiniSpark title="Auth anomalies" values={authMetrics?.sparklines?.authAnomalies ?? []} color="#fbbf24" />
          <MiniSpark title="MFA coverage %" values={authMetrics?.sparklines?.mfaCoveragePercent ?? []} color="#34d399" />
        </div>
      </section>

      {/* Live feed */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0c121d]/95 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Realtime security plane</h2>
          <span className="text-[10px] text-slate-600">{events?.items?.length ?? 0} correlated rows</span>
        </div>
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {(events?.items ?? []).map((ev) => {
            const sev = String(ev.severity ?? "").toLowerCase();
            const tone =
              sev === "critical" || sev === "high"
                ? "border-rose-500/25 bg-rose-500/8"
                : sev === "medium"
                  ? "border-amber-500/20 bg-amber-500/8"
                  : "border-white/[0.06] bg-black/25";
            return (
              <div key={`${ev.channel}-${ev.id}`} className={`rounded-xl border px-3 py-2 text-xs ${tone}`}>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                  <span className="text-cyan-400/90">{ev.channel}</span>
                  <span>{new Date(ev.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] normal-case text-slate-400">{ev.kind}</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">{ev.severity}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-slate-200">{ev.message}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{ev.source}</p>
              </div>
            );
          })}
          {!events?.items?.length ? (
            <p className="py-8 text-center text-sm text-slate-600">No telemetry rows yet — generate SOC activity to populate this lane.</p>
          ) : null}
        </div>
      </section>

      <Suspense fallback={drawer.open ? <div className="fixed bottom-4 right-4 z-[82] text-xs text-slate-500">Loading inspector…</div> : null}>
        <SecurityControlDrawer controlId={drawer.id} open={drawer.open} onClose={() => setDrawer({ open: false, id: null })} />
      </Suspense>
    </div>
  );
}
