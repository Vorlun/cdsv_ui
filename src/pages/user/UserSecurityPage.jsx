import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Lock,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";
import { ApiError } from "@/services/api/apiError";
import { getSocSecurityStatus } from "@/services/api";
import SocUserPageShell from "@/components/soc/SocUserPageShell";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";

/* ─── constants ──────────────────────────────────────────────────── */

const CACHE_KEY = "soc-security-control-plane-cache-v2";

const INITIAL_SECURITY = {
  status: "initializing",
  mode: "initializing",
  cacheAge: 0,
  hasEvidence: false,
  securityScore: 0,
  lastSuccessfulSync: new Date().toISOString(),
  components: { tlsHealth: 0, relayHealth: 0, verificationRate: 0, threatScore: 0, forensicVerification: 0, socConfidence: 0 },
  metrics: { tlsTunnelsActive: 0, tlsTunnelsDegraded: 0, socRelayHealth: 0, threatEventsMedium: 0, threatEventsCritical: 0, verifiedObjects: 0, totalObjects: 0, averageLatency: 0, relayNodesOnline: 0, relayNodesTotal: 5, trustPropagation: 0, packetIntegrity: 0 },
  forensicHealth: { sha256Validation: 0, aes256Encryption: 0, heuristicScan: 0, socTelemetry: 0 },
  threatAnalysis: { level: "LOW RISK", summary: "Security posture initializing.", detail: "Awaiting first secure ingestion event.", anomalyScore: 0 },
  telemetryStream: [],
  timeline: [],
};

/* ─── pure helpers ───────────────────────────────────────────────── */

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtClock(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

function wait(ms) { return new Promise((r) => window.setTimeout(r, ms)); }

function readCachedPosture() {
  try { const raw = window.localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function writeCachedPosture(payload) {
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() })); } catch { /**/ }
}

function sbStatus(value, okT = 90, warnT = 70) {
  if (value >= okT) return "OK"; if (value >= warnT) return "WARNING"; return "FAILED";
}

function sbTone(s, isLight) {
  if (s === "OK")      return isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300";
  if (s === "WARNING") return isLight ? "bg-amber-50 text-amber-700"     : "bg-amber-500/15 text-amber-300";
  return isLight ? "bg-rose-50 text-rose-700" : "bg-rose-500/15 text-rose-300";
}

function getDiagnosticChecks(metrics, components, forensicHealth, threat) {
  return [
    { label: "Relay Node Status",       value: `${metrics.relayNodesOnline}/${metrics.relayNodesTotal} online`, status: metrics.relayNodesOnline >= metrics.relayNodesTotal ? "OK" : metrics.relayNodesOnline > 0 ? "WARNING" : "FAILED" },
    { label: "TLS Verification",        value: `${clampPct(components.tlsHealth)}% integrity`,                  status: sbStatus(clampPct(components.tlsHealth)) },
    { label: "Latency Check",           value: `${metrics.averageLatency}ms avg`,                                status: metrics.averageLatency <= 50 ? "OK" : metrics.averageLatency <= 100 ? "WARNING" : "FAILED" },
    { label: "Forensic Hash (SHA-256)", value: `${clampPct(forensicHealth.sha256Validation)}%`,                  status: sbStatus(clampPct(forensicHealth.sha256Validation)) },
    { label: "Packet Propagation",      value: `${clampPct(metrics.packetIntegrity)}% integrity`,                status: sbStatus(clampPct(metrics.packetIntegrity)) },
    { label: "Vault Replication",       value: `${clampPct(forensicHealth.aes256Encryption)}% AES-256`,          status: sbStatus(clampPct(forensicHealth.aes256Encryption)) },
    { label: "Active Anomalies",        value: `${clampPct(threat.anomalyScore)}% anomaly score`,                status: threat.anomalyScore <= 20 ? "OK" : threat.anomalyScore <= 50 ? "WARNING" : "FAILED" },
    { label: "SOC Sync Confidence",     value: `${clampPct(components.socConfidence)}% confidence`,              status: sbStatus(clampPct(components.socConfidence)) },
  ];
}

/* ─── micro-components ───────────────────────────────────────────── */

function Toast({ message, type, onDismiss, isLight }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl ${
      type === "success"
        ? isLight ? "border-emerald-200 bg-white text-emerald-700 shadow-emerald-100" : "border-emerald-400/30 bg-[#081225] text-emerald-200"
        : isLight ? "border-rose-200 bg-white text-rose-700 shadow-rose-100"          : "border-rose-400/30 bg-[#081225] text-rose-200"
    }`}>
      {type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
      <span className="text-sm font-semibold">{message}</span>
      <button type="button" onClick={onDismiss} className="ml-1 rounded-lg p-1 opacity-60 transition hover:opacity-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
    </div>
  );
}

function DiagnosticsModal({ posture, metrics, components, forensicHealth, threat, mode, onClose, isLight }) {
  const hasEvidence = Boolean(posture.hasEvidence);
  const checks = getDiagnosticChecks(metrics, components, forensicHealth, threat);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="SOC Diagnostic Console" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-3xl border p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] ${
          isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#081225]"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>SOC Diagnostic Console</h2>
            <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>Control-plane health validation and relay node status.</p>
          </div>
          <button type="button" onClick={onClose}
            className={`shrink-0 rounded-xl border p-2 transition active:scale-95 ${isLight ? "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900" : "border-white/10 bg-white/[0.05] text-slate-400 hover:border-white/20 hover:text-white"}`}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {checks.map((check) => {
            const s = hasEvidence ? check.status : "INIT";
            return (
              <div key={check.label} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-slate-950/40"}`}>
                <span className={`text-sm ${isLight ? "text-slate-700" : "text-slate-200"}`}>{check.label}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${isLight ? "text-slate-400" : "text-slate-500"}`}>{hasEvidence ? check.value : "—"}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${!hasEvidence ? (isLight ? "bg-slate-100 text-slate-400" : "bg-slate-800 text-slate-500") : sbTone(s, isLight)}`}>{s}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={`mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border px-4 py-3 text-sm ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-slate-950/40"}`}>
          <p><span className={isLight ? "text-slate-400" : "text-slate-500"}>Mode: </span><span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{mode}</span></p>
          <p><span className={isLight ? "text-slate-400" : "text-slate-500"}>Cache age: </span><span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{Number(posture.cacheAge || 0)}s</span></p>
          <p><span className={isLight ? "text-slate-400" : "text-slate-500"}>Last sync: </span><span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>{fmtClock(posture.lastSuccessfulSync)}</span></p>
          <p><span className={isLight ? "text-slate-400" : "text-slate-500"}>Strategy: </span><span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>abort + exp. backoff</span></p>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, active }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clampPct(score) / 100);
  const color = score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg className="h-[68px] w-[68px] -rotate-90" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={active ? offset : c}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[12px] font-black tabular-nums" style={{ color }}>{active ? `${clampPct(score)}` : "--"}</span>
      </div>
    </div>
  );
}

function PostureCard({ score, active, confidence, isLight }) {
  const tone = score >= 90 ? (isLight ? "text-emerald-600" : "text-emerald-300") : score >= 70 ? (isLight ? "text-amber-600" : "text-amber-300") : (isLight ? "text-rose-600" : "text-rose-300");
  const label = score >= 90 ? "Excellent" : score >= 70 ? "Secure" : score >= 50 ? "At Risk" : "Critical";
  const badgeBg = score >= 90 ? (isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300") : score >= 70 ? (isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/15 text-amber-300") : (isLight ? "bg-rose-50 text-rose-700" : "bg-rose-500/15 text-rose-300");
  const card = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)]"
    : "rounded-3xl border border-white/10 bg-[#081225]/90 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/25";
  return (
    <div className={`flex items-center gap-4 p-5 ${card}`}>
      <ScoreRing score={score} active={active} />
      <div className="min-w-0">
        <p className={`text-3xl font-semibold tabular-nums leading-none ${tone}`}>{active ? `${clampPct(score)}%` : "--"}</p>
        <p className={`mt-1.5 text-xs font-semibold uppercase tracking-[0.22em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Security posture</p>
        <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>confidence {active ? `${clampPct(confidence)}%` : "--"}</p>
        {active && <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeBg}`}>{label}</span>}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "text-emerald-400", isLight }) {
  const lightTone = tone.replace("-300", "-600").replace("-400", "-600");
  const card = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-slate-300"
    : "rounded-3xl border border-white/10 bg-[#081225]/90 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/25";
  return (
    <div className={`flex flex-col p-5 ${card}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-slate-950/60"}`}>
          <Icon className={`h-4 w-4 ${isLight ? "text-blue-500" : "text-sky-300"}`} aria-hidden />
        </span>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      </div>
      <p className={`text-3xl font-semibold tabular-nums leading-none ${isLight ? lightTone : tone}`}>{value}</p>
      <p className={`mt-2 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>{detail}</p>
    </div>
  );
}

function ForensicBar({ label, value, isLight }) {
  const pct = clampPct(value);
  const barColor = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";
  const trackColor = isLight ? "bg-slate-100" : "bg-white/[0.08]";
  const statusLabel = pct >= 90 ? "healthy" : pct >= 70 ? "stable" : "warning";
  const statusTone = pct >= 90
    ? (isLight ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/10 text-emerald-400")
    : pct >= 70
      ? (isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400")
      : (isLight ? "bg-rose-50 text-rose-700" : "bg-rose-500/10 text-rose-400");
  return (
    <div className={`flex h-[44px] items-center gap-3 border-t first:border-t-0 ${isLight ? "border-slate-100" : "border-white/[0.05]"}`}>
      <span className={`w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
      <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${trackColor}`}>
        <div className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-9 text-right text-sm font-bold tabular-nums ${isLight ? "text-slate-700" : "text-white"}`}>{pct}%</span>
      <span className={`w-14 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide ${statusTone}`}>{statusLabel}</span>
    </div>
  );
}

const TOPO_NODES = [
  { label: "EDGE",  sub: "subscriber",  icon: "⬡", status: "online" },
  { label: "CORE",  sub: "ingest",       icon: "⬡", status: "online" },
  { label: "SOC",   sub: "correlation",  icon: "⬡", status: "active" },
  { label: "VAULT", sub: "AES archive",  icon: "⬡", status: "secured" },
  { label: "GRID",  sub: "custody",      icon: "⬡", status: "synced" },
];

const STATUS_COLOR = {
  online:  { light: "text-emerald-600",  dark: "text-emerald-400" },
  active:  { light: "text-blue-600",     dark: "text-cyan-300" },
  secured: { light: "text-violet-600",   dark: "text-violet-300" },
  synced:  { light: "text-sky-600",      dark: "text-sky-300" },
};

function TopologyFlow({ active, isLight }) {
  return (
    <div className="relative w-full">
      {/* Connection rail — absolutely positioned behind nodes */}
      <div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 items-center px-[10%]" aria-hidden>
        <div className={`h-[2px] w-full rounded-full ${
          active
            ? isLight ? "bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" : "bg-gradient-to-r from-cyan-900/40 via-cyan-400/60 to-cyan-900/40"
            : isLight ? "bg-slate-100" : "bg-white/[0.05]"
        }`}>
          {/* animated signal pulse */}
          {active && (
            <div
              className={`h-full w-1/4 rounded-full ${isLight ? "bg-blue-400/70" : "bg-cyan-400/80"}`}
              style={{ animation: "topoSignalPulse 2.8s ease-in-out infinite" }}
            />
          )}
        </div>
      </div>

      {/* Nodes */}
      <div className="relative flex items-stretch justify-between gap-2">
        {TOPO_NODES.map((node) => {
          const sc = STATUS_COLOR[node.status] ?? STATUS_COLOR.online;
          return (
            <div
              key={node.label}
              className={`relative flex flex-1 flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition-all duration-300 ${
                active
                  ? isLight
                    ? "border-blue-200 bg-blue-50/80 hover:border-blue-300 hover:bg-blue-50"
                    : "border-cyan-400/25 bg-[#051428]/80 hover:border-cyan-400/45 hover:bg-[#081c3a]/80"
                  : isLight
                    ? "border-slate-100 bg-slate-50/80 hover:border-slate-200"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
              }`}
            >
              {/* Online indicator */}
              {active && (
                <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${isLight ? "bg-emerald-500" : "bg-emerald-400"} animate-pulse`} />
              )}

              {/* Hex node icon */}
              <span className={`text-lg leading-none ${active ? (isLight ? "text-blue-400" : "text-cyan-400/70") : (isLight ? "text-slate-300" : "text-white/20")}`}>
                {node.icon}
              </span>

              <p className={`mt-1 text-[12px] font-black uppercase tracking-[0.15em] leading-tight ${
                active ? (isLight ? sc.light : sc.dark) : (isLight ? "text-slate-400" : "text-slate-600")
              }`}>
                {node.label}
              </p>
              <p className={`mt-0.5 text-[10px] leading-tight ${isLight ? "text-slate-400" : "text-slate-600"}`}>
                {node.sub}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function UserSecurityPage() {
  const { isLight } = useWorkspaceControl();

  const [posture, setPosture] = useState(() => readCachedPosture() || INITIAL_SECURITY);
  const [loading, setLoading] = useState(() => !readCachedPosture());
  const [degradedNotice, setDegradedNotice] = useState(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [toast, setToast] = useState(null);
  const abortRef = useRef(null);
  const streamRef = useRef(null);
  const toastTimerRef = useRef(null);

  const hasEvidence = Boolean(posture.hasEvidence);
  const mode = String(posture.mode || "initializing");
  const controlMode = String(posture.status || (mode === "cached" ? "degraded" : "normal"));
  const score = clampPct(posture.securityScore);
  const metrics = posture.metrics || INITIAL_SECURITY.metrics;
  const components = posture.components || INITIAL_SECURITY.components;
  const forensicHealth = posture.forensicHealth || INITIAL_SECURITY.forensicHealth;
  const threat = posture.threatAnalysis || INITIAL_SECURITY.threatAnalysis;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const telemetryStream = Array.isArray(posture.telemetryStream) ? posture.telemetryStream : [];
  const timeline = Array.isArray(posture.timeline) ? posture.timeline : [];

  /* card style string — adapts to theme */
  const CARD = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-slate-300"
    : "rounded-3xl border border-white/10 bg-[#081225]/90 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/25";

  const modeTone = controlMode === "critical"
    ? isLight ? "border-rose-200 bg-rose-50 text-rose-700"   : "border-rose-400/40 bg-rose-500/10 text-rose-200"
    : controlMode === "degraded" || mode === "cached"
      ? isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-400/40 bg-amber-500/10 text-amber-200"
      : isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";

  const threatTone = String(threat.level).includes("CRITICAL")
    ? isLight ? "border-rose-200 bg-rose-50 text-rose-700"   : "border-rose-400/30 bg-rose-500/10 text-rose-300"
    : String(threat.level).includes("MEDIUM")
      ? isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-400/30 bg-amber-500/10 text-amber-300"
      : isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";

  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4_000);
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);

  const syncSecurityStatus = useCallback(async ({ manual = false, attempts = 1, onSuccess, onError } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (manual) setRetrying(true);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await wait(650 * 2 ** (attempt - 1));
      try {
        const next = await getSocSecurityStatus({ signal: controller.signal });
        if (controller.signal.aborted) return;
        setPosture(next);
        writeCachedPosture(next);
        // Clear any previous error banner — mode / status info is shown in header chips
        setDegradedNotice(null);
        if (manual) showToast("Telemetry synchronization restored · relay mesh active.", "success");
        setLoading(false); setRetrying(false); onSuccess?.(); return;
      } catch (error) {
        if (controller.signal.aborted) return;
        if (attempt < attempts - 1) continue;
        const cached = readCachedPosture();
        if (cached) setPosture({ ...cached, mode: "cached", status: cached.status === "critical" ? "critical" : "degraded" });
        const raw = error instanceof ApiError ? String(error.message) : "Control-plane request failed.";
        const isRateLimited = /throttler|too many requests|429/i.test(raw);
        setDegradedNotice(isRateLimited ? "Rate limit reached. Cached relay posture active." : "Security telemetry degraded. Cached posture active.");
        setLoading(false); setRetrying(false); onError?.();
      }
    }
  }, []);

  useEffect(() => { void syncSecurityStatus({ attempts: 2 }); return () => abortRef.current?.abort(); }, [syncSecurityStatus]);
  useEffect(() => { const id = window.setInterval(() => void syncSecurityStatus({ attempts: 1 }), 45_000); return () => window.clearInterval(id); }, [syncSecurityStatus]);
  useEffect(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, [telemetryStream]);

  const retrySync = useCallback(() => {
    const now = fmtClock(new Date());
    setPosture((prev) => ({
      ...prev,
      telemetryStream: [
        { id: `retry-${Date.now()}`, at: now, label: "Control plane synchronization initiated", severity: "info" },
        ...(Array.isArray(prev.telemetryStream) ? prev.telemetryStream : []).slice(0, 7),
      ],
    }));
    void syncSecurityStatus({
      manual: true, attempts: 3,
      onSuccess: () => showToast("Telemetry synchronization restored", "success"),
      onError: () => showToast("Relay endpoint timeout — cached posture active", "error"),
    });
  }, [syncSecurityStatus, showToast]);

  const defaultTimeline = [
    { time: "--:--", label: "TLS VALIDATED",   status: "pending" },
    { time: "--:--", label: "RELAY CONNECTED", status: "pending" },
    { time: "--:--", label: "HASH VERIFIED",   status: "pending" },
    { time: "--:--", label: "VAULT SYNCED",    status: "pending" },
    { time: "--:--", label: "CUSTODY LOCKED",  status: "pending" },
  ];

  const isLive = hasEvidence && controlMode !== "degraded" && controlMode !== "critical";

  /* ── header badge ──────────────────────────────────────────────── */
  const headerBadge = (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${modeTone}`}>
        <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
        {controlMode === "critical" ? "Critical" : mode === "cached" || controlMode === "degraded" ? "Cached" : "Active"}
      </span>
      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-cyan-400/25 bg-cyan-500/10 text-cyan-200"}`}>
        relay sync
      </span>
      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
        {hasEvidence ? `${clampPct(components.socConfidence)}% confidence` : "awaiting data"}
      </span>
      <button type="button" onClick={retrySync} disabled={retrying || loading}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all hover:-translate-y-px active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
          isLight
            ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
            : "border-white/15 bg-white/[0.06] text-white hover:border-sky-500/50 hover:shadow-[0_0_16px_-6px_rgba(56,189,248,0.5)]"
        }`}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${retrying || loading ? "animate-spin" : ""}`} aria-hidden />
        {retrying ? "Syncing…" : "Retry"}
      </button>
      <button type="button" onClick={() => setDiagnosticsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all hover:-translate-y-px active:scale-95 ${
          isLight
            ? "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-500/30 hover:text-white"
        }`}
      >
        <Zap className="h-3.5 w-3.5" aria-hidden />
        Diagnostics
      </button>
    </div>
  );

  return (
    <SocUserPageShell
      title="Security Control Plane"
      subtitle="Live telecom infrastructure telemetry and secure relay posture monitoring."
      badge={headerBadge}
    >
      {/* ── toast ──────────────────────────────────────────────────── */}
      {toast ? <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} isLight={isLight} /> : null}

      {/* ── diagnostics ────────────────────────────────────────────── */}
      {diagnosticsOpen ? (
        <DiagnosticsModal posture={posture} metrics={metrics} components={components} forensicHealth={forensicHealth} threat={threat} mode={mode} onClose={() => setDiagnosticsOpen(false)} isLight={isLight} />
      ) : null}

      {/* ── degraded banner ─────────────────────────────────────────── */}
      {degradedNotice ? (
        <div role="status" className={`flex h-16 items-center gap-3 rounded-2xl border px-5 ${isLight ? "border-amber-200 bg-amber-50" : "border-amber-400/25 bg-amber-500/[0.07]"}`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${isLight ? "text-amber-600" : "text-amber-400"}`} aria-hidden />
          <span className={`flex-1 text-sm font-medium ${isLight ? "text-amber-800" : "text-amber-200"}`}>{degradedNotice}</span>
          <span className={`shrink-0 text-sm ${isLight ? "text-amber-500" : "text-amber-100/40"}`}>Last sync: {fmtClock(posture.lastSuccessfulSync)}</span>
          <button type="button" onClick={retrySync} disabled={retrying || loading}
            className={`shrink-0 rounded-lg border px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px active:scale-95 disabled:opacity-40 ${isLight ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50" : "border-amber-200/20 bg-white/[0.08] text-white hover:bg-white/[0.14]"}`}
          >
            {retrying ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Retry"}
          </button>
          <button type="button" onClick={() => setDiagnosticsOpen(true)}
            className={`shrink-0 rounded-lg border px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px active:scale-95 ${isLight ? "border-slate-200 bg-white text-slate-600 hover:text-slate-900" : "border-white/10 bg-slate-950/30 text-slate-300 hover:text-white"}`}
          >
            Diagnostics
          </button>
        </div>
      ) : null}

      {/* ── ROW 1: posture + 4 metric cards ─────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <PostureCard score={score} active={hasEvidence} confidence={components.socConfidence} isLight={isLight} />
        <MetricCard icon={Lock} label="TLS Tunnels"
          value={hasEvidence ? String(metrics.tlsTunnelsActive ?? 0) : "--"}
          detail={hasEvidence ? `${metrics.tlsTunnelsDegraded ?? 0} degraded` : "awaiting ingestion"}
          tone="text-emerald-400" isLight={isLight}
        />
        <MetricCard icon={RadioTower} label="SOC Relay"
          value={hasEvidence ? `${clampPct(metrics.socRelayHealth)}%` : "--"}
          detail="relay mesh health"
          tone="text-cyan-400" isLight={isLight}
        />
        <MetricCard icon={AlertTriangle} label="Threat Events"
          value={hasEvidence ? String((metrics.threatEventsMedium ?? 0) + (metrics.threatEventsCritical ?? 0)) : "--"}
          detail={hasEvidence ? `${metrics.threatEventsMedium ?? 0} med · ${metrics.threatEventsCritical ?? 0} crit` : "no active threats"}
          tone={Number(metrics.threatEventsCritical ?? 0) > 0 ? "text-rose-400" : "text-amber-400"} isLight={isLight}
        />
        <MetricCard icon={DatabaseZap} label="Forensic Queue"
          value={hasEvidence ? String(metrics.verifiedObjects ?? 0) : "--"}
          detail={`${metrics.totalObjects ?? 0} indexed`}
          tone="text-emerald-400" isLight={isLight}
        />
      </section>

      {/* ── ROW 2: telemetry (col-8) + threat (col-4) ───────────────── */}
      <section className="grid grid-cols-12 gap-4">
        {/* telemetry stream */}
        <div className={`col-span-12 p-5 xl:col-span-8 ${CARD}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-slate-950/60"}`}>
                <TerminalSquare className={`h-4 w-4 ${isLight ? "text-blue-500" : "text-cyan-300"}`} aria-hidden />
              </span>
              <h3 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Telemetry Stream</h3>
            </div>
            <span className={`flex items-center gap-2 text-sm ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              <span className={`h-2 w-2 rounded-full ${hasEvidence ? "animate-pulse bg-emerald-400" : isLight ? "bg-slate-300" : "bg-slate-700"}`} />
              {hasEvidence ? "live" : "idle"}
            </span>
          </div>
          <div ref={streamRef} className={`max-h-[320px] overflow-y-auto rounded-xl border p-2 font-mono ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-slate-950/50"}`}>
            {telemetryStream.length ? (
              telemetryStream.map((event, index) => (
                <div key={String(event.id || index)} className={`flex h-12 items-center gap-3 rounded-lg px-3 ${isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.03]"}`}>
                  <span className={event.severity === "critical" ? "h-2 w-2 shrink-0 rounded-full bg-rose-400" : event.severity === "medium" ? "h-2 w-2 shrink-0 rounded-full bg-amber-400" : "h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400"} />
                  <span className={`shrink-0 text-sm ${isLight ? "text-blue-600" : "text-cyan-300"}`}>[{String(event.at || "--:--:--")}]</span>
                  <span className={`text-sm ${isLight ? "text-slate-600" : "text-slate-300"}`}>{String(event.label || "Heartbeat received")}</span>
                </div>
              ))
            ) : (
              <p className={`flex h-12 items-center px-3 text-sm ${isLight ? "text-slate-400" : "text-slate-600"}`}>Awaiting first secure ingestion event<span className="ml-1 animate-pulse">_</span></p>
            )}
          </div>
        </div>

        {/* threat analysis */}
        <div className={`col-span-12 flex flex-col p-5 xl:col-span-4 ${CARD}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-slate-950/60"}`}>
                <ShieldAlert className={String(threat.level).includes("CRITICAL") ? "h-4 w-4 text-rose-500" : String(threat.level).includes("MEDIUM") ? "h-4 w-4 text-amber-500" : `h-4 w-4 ${isLight ? "text-emerald-600" : "text-emerald-300"}`} aria-hidden />
              </span>
              <h3 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Threats</h3>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${threatTone}`}>
              {hasEvidence ? String(threat.level || "LOW RISK") : "INIT"}
            </span>
          </div>
          <p className={`mb-4 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>{String(threat.detail || "Awaiting first ingestion event.")}</p>
          <div className={`flex-1 space-y-2 rounded-xl border px-4 py-3 text-sm ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-slate-950/40"}`}>
            {[
              ["Anomaly type", hasEvidence ? "Entropy deviation" : "—"],
              ["Confidence",   hasEvidence ? `${clampPct(threat.anomalyScore)}%` : "—"],
              ["Inspection",   hasEvidence ? "HEURISTIC PASS" : "—"],
              ["Relay source", hasEvidence ? "SOC-EAST relay" : "—"],
              ["Mitigation",   hasEvidence ? "Monitored" : "—"],
            ].map(([k, v]) => (
              <div key={k} className={`flex items-center justify-between border-t py-1.5 first:border-t-0 first:pt-0 ${isLight ? "border-slate-100" : "border-white/[0.05]"}`}>
                <span className={isLight ? "text-slate-400" : "text-slate-500"}>{k}</span>
                <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "Relay Risk", value: hasEvidence ? `${clampPct(100 - clampPct(components.relayHealth))}%` : "--", tone: isLight ? "text-amber-600" : "text-amber-300" },
              { label: "SOC Conf.",  value: hasEvidence ? `${clampPct(components.socConfidence)}%` : "--",              tone: isLight ? "text-emerald-700" : "text-emerald-300" },
            ].map(({ label, value, tone }) => (
              <div key={label} className={`rounded-xl border px-3 py-2.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-slate-950/40"}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROW 3: topology (col-6) + forensic health (col-6) ───────── */}
      <section className="grid grid-cols-12 gap-4">
        {/* topology */}
        <div className={`col-span-12 p-5 xl:col-span-6 ${CARD}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Relay Topology</h3>
            <span className={`text-sm ${isLight ? "text-slate-400" : "text-slate-500"}`}>EDGE → VAULT signal path</span>
          </div>
          <TopologyFlow active={hasEvidence} isLight={isLight} />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Nodes",     value: hasEvidence ? `${metrics.relayNodesOnline}/${metrics.relayNodesTotal}` : "--", tone: isLight ? "text-blue-600" : "text-cyan-300" },
              { label: "Latency",   value: hasEvidence ? `${metrics.averageLatency}ms` : "--",                            tone: isLight ? "text-amber-600" : "text-amber-300" },
              { label: "Trust",     value: hasEvidence ? `${clampPct(metrics.trustPropagation)}%` : "--",                 tone: isLight ? "text-emerald-700" : "text-emerald-300" },
              { label: "Integrity", value: hasEvidence ? `${clampPct(metrics.packetIntegrity)}%` : "--",                  tone: isLight ? "text-emerald-700" : "text-emerald-300" },
            ].map(({ label, value, tone }) => (
              <div key={label} className={`rounded-xl border px-3 py-2.5 text-center ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-slate-950/40"}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* forensic health */}
        <div className={`col-span-12 p-5 xl:col-span-6 ${CARD}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Forensic Health</h3>
            <div className="flex gap-2">
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>TLS {hasEvidence ? `${clampPct(components.tlsHealth)}%` : "--"}</span>
              <span className={isLight ? "text-slate-300" : "text-slate-700"}>·</span>
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Forensic {hasEvidence ? `${clampPct(components.forensicVerification)}%` : "--"}</span>
            </div>
          </div>
          <div>
            <ForensicBar label="SHA-256" value={forensicHealth.sha256Validation} isLight={isLight} />
            <ForensicBar label="AES-256" value={forensicHealth.aes256Encryption} isLight={isLight} />
            <ForensicBar label="Heuristic" value={forensicHealth.heuristicScan} isLight={isLight} />
            <ForensicBar label="SOC Telemetry" value={forensicHealth.socTelemetry} isLight={isLight} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "TLS",      value: hasEvidence ? `${clampPct(components.tlsHealth)}%` : "--",            tone: isLight ? "text-emerald-700" : "text-emerald-300" },
              { label: "Relay",    value: hasEvidence ? `${clampPct(components.relayHealth)}%` : "--",          tone: isLight ? "text-blue-600" : "text-cyan-300" },
              { label: "Forensic", value: hasEvidence ? `${clampPct(components.forensicVerification)}%` : "--", tone: isLight ? "text-emerald-700" : "text-emerald-300" },
            ].map(({ label, value, tone }) => (
              <div key={label} className={`rounded-xl border px-3 py-2.5 text-center ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-slate-950/40"}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROW 4: timeline — horizontal compact event pills ─────────── */}
      <section className={`p-5 ${CARD}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Security Timeline</h3>
          <span className={`text-sm ${isLight ? "text-slate-400" : "text-slate-500"}`}>{hasEvidence ? "live events" : "pending"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(timeline.length ? timeline : defaultTimeline).map((item) => (
            <div
              key={`${item.time}-${item.label}`}
              className={`flex h-[52px] items-center gap-2.5 rounded-full border px-4 transition-all duration-300 ${
                hasEvidence
                  ? isLight ? "border-blue-200 bg-blue-50 hover:border-blue-300" : "border-cyan-400/20 bg-cyan-400/[0.04] hover:border-cyan-400/40"
                  : isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hasEvidence ? "animate-pulse bg-emerald-400" : isLight ? "bg-slate-300" : "bg-slate-700"}`} />
              <span className={`font-mono text-sm ${isLight ? "text-blue-600" : "text-cyan-300"}`}>{String(item.time)}</span>
              <span className={`text-sm font-semibold uppercase tracking-[0.11em] ${isLight ? "text-slate-700" : "text-white"}`}>{String(item.label)}</span>
            </div>
          ))}
        </div>
      </section>
    </SocUserPageShell>
  );
}
