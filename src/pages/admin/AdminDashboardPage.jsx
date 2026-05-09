import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Eye,
  FileJson,
  FileSearch,
  GitBranch,
  Globe,
  HardDrive,
  Loader2,
  Lock,
  Radio,
  RefreshCw,
  ScrollText,
  Server,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Download,
  MoreHorizontal,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { downloadSocFile } from "@/services/api";

const REFRESH_MS = 20_000;
/** Normalized chart margins — Splunk/Datadog-style breathing room */
const ANALYTICS_CHART_MARGIN = { top: 6, right: 6, left: 4, bottom: 6 };
const AXIS_TICK_STYLE = { fontSize: 10, fill: "#64748b" };
/** Unified chart motion — avoids staggered perceived lag across dashboard */
const CHART_ANIM_MS = 620;

/* ─────────────────────────── data hook ─────────────────────────── */

function useAdminStats() {
  const [overview, setOverview] = useState(null);
  const [stats, setStats]       = useState(null);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);
  const wsBatchRef = useRef(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ov, st, h] = await Promise.allSettled([
        socApi.adminDashboardOverview(),
        socApi.adminStats(),
        socApi.adminHealth(),
      ]);
      if (ov.status === "fulfilled" && ov.value) setOverview(ov.value);
      if (st.status === "fulfilled" && st.value) setStats(st.value);
      if (h.status  === "fulfilled" && h.value)  setHealth(h.value);

      if (ov.status === "rejected") {
        setError(ov.reason?.status === 403
          ? "Access denied — admin role required. Please log out and log in again."
          : normalizeSocError(ov.reason).message);
      } else {
        setError(null);
      }
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      if (!silent) setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    void fetch();
    timerRef.current = setInterval(() => void fetch(true), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch]);

  useEffect(() => {
    const unsub = subscribeSocStream((ev) => {
      if (ev?.type === "upload" || ev?.stage === "upload" || ev?.severity === "critical") {
        if (wsBatchRef.current) window.clearTimeout(wsBatchRef.current);
        wsBatchRef.current = window.setTimeout(() => {
          wsBatchRef.current = null;
          void fetch(true);
        }, 420);
      }
    });
    return () => {
      unsub();
      if (wsBatchRef.current) window.clearTimeout(wsBatchRef.current);
    };
  }, [fetch]);

  return { overview, stats, health, loading, error, lastRefresh, refresh: () => fetch() };
}

/* ─────────────────────────── helpers ───────────────────────────── */

function fmtBytes(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

/** Recent uploads: relative + compact clock for SOC tables */
function fmtUploadedAt(iso) {
  if (!iso) return "—";
  const rel = fmtTime(iso);
  const hm = new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${rel} · ${hm}`;
}

function fmtUptime(s) {
  if (!s && s !== 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getInitials(name, email) {
  const src = name || email || "U";
  const parts = src.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

const THREAT_STYLE = {
  critical: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  high:     "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  medium:   "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low:      "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  none:     "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

const CHART_TOOLTIP_STYLE = {
  background: "#1a2130",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 11,
  color: "#E5E7EB",
};

/* ─────────────────────────── shared components ──────────────────── */

function LivePulse({ connected = true }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        {connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/55 opacity-25" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.35)] ${connected ? "bg-emerald-400" : "bg-slate-600"}`} />
      </span>
      <span className={connected ? "text-emerald-400" : "text-slate-500"}>
        {connected ? "LIVE" : "OFFLINE"}
      </span>
    </span>
  );
}

function SectionTitle({ children, icon: Icon, action }) {
  return (
    <div className="mb-3 flex min-h-[1.25rem] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">{children}</h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "cyan", trend, trendLabel }) {
  const palette = {
    cyan:    { icon: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20",    glow: "shadow-cyan-400/10" },
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", glow: "shadow-emerald-400/10" },
    amber:   { icon: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   glow: "shadow-amber-400/10" },
    rose:    { icon: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/20",     glow: "shadow-rose-400/10" },
    violet:  { icon: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/20",  glow: "shadow-violet-400/10" },
    blue:    { icon: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    glow: "shadow-blue-400/10" },
    sky:     { icon: "text-sky-400",     bg: "bg-sky-400/10",     border: "border-sky-400/20",     glow: "shadow-sky-400/10" },
    orange:  { icon: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20",  glow: "shadow-orange-400/10" },
  };
  const p = palette[color] ?? palette.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#131d31]/96 to-[#0c1424]/98 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-all duration-200 hover:border-white/[0.11] hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${p.bg} ${p.border}`}>
          <Icon className={`h-4.5 w-4.5 ${p.icon}`} style={{ width: "1.125rem", height: "1.125rem" }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-bold tabular-nums tracking-tight ${p.icon}`}>{value ?? "—"}</p>
        <p className="mt-0.5 text-[11px] font-medium text-[#9CA3AF]">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-[#4B5563]">{sub}</p>}
        {trendLabel && <p className="mt-0.5 text-[10px] text-[#4B5563]">{trendLabel}</p>}
      </div>
      {/* subtle gradient glow */}
      <div className={`pointer-events-none absolute -bottom-4 -right-4 h-14 w-14 rounded-full ${p.bg} blur-xl opacity-[0.38]`} />
    </motion.div>
  );
}

function HealthBar({ label, value, color = "cyan" }) {
  const colorMap = { cyan: "bg-cyan-400", emerald: "bg-emerald-400", amber: "bg-amber-400", rose: "bg-rose-400" };
  const glowMap = {
    cyan: "shadow-[0_0_12px_-6px_rgba(34,211,238,0.18)]",
    emerald: "shadow-[0_0_12px_-6px_rgba(52,211,153,0.16)]",
    amber: "shadow-[0_0_12px_-6px_rgba(251,191,36,0.15)]",
    rose: "shadow-[0_0_12px_-5px_rgba(244,63,94,0.26)]",
  };
  const bar = colorMap[color] ?? colorMap.cyan;
  const safe = Math.min(100, Math.max(0, Number(value) || 0));
  const isHigh = safe > 80;
  const barGlow = isHigh ? glowMap.rose : glowMap[color] ?? glowMap.cyan;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] leading-tight">
        <span className="min-w-0 font-semibold tracking-tight text-[#d6dfea]">{label}</span>
        <span
          className={`shrink-0 font-mono text-[11px] font-bold tabular-nums tracking-tight ${isHigh ? "text-rose-400" : "text-slate-100"}`}
        >
          {safe}%
        </span>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/[0.07] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${isHigh ? "bg-rose-400" : bar} ${barGlow}`}
        />
      </div>
    </div>
  );
}

/* ───────── Live SOC — enterprise stream layout ───────── */

function hashNodeCode(id) {
  const s = String(id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const SOC_REGIONS = ["EAST", "WEST", "CORE", "EDGE"];

function socNodeLabel(id) {
  const h = hashNodeCode(id);
  return `SOC-${SOC_REGIONS[h % SOC_REGIONS.length]}-${String((h % 90) + 10)}`;
}

const SEV_RING = {
  critical: "ring-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.14)]",
  high:     "ring-orange-500/38 shadow-[0_0_8px_rgba(249,115,22,0.12)]",
  medium:   "ring-amber-400/32 shadow-[0_0_7px_rgba(250,204,21,0.09)]",
  low:      "ring-cyan-400/28 shadow-[0_0_7px_rgba(34,211,238,0.08)]",
  safe:     "ring-emerald-500/28 shadow-[0_0_6px_rgba(52,211,153,0.08)]",
  info:     "ring-slate-500/25",
};

const SEV_BADGE = {
  critical: "bg-rose-500/12 text-rose-200 border-rose-500/25",
  high:     "bg-orange-500/12 text-orange-200 border-orange-500/25",
  medium:   "bg-amber-500/12 text-amber-200 border-amber-500/20",
  low:      "bg-cyan-500/12 text-cyan-200 border-cyan-500/20",
  safe:     "bg-emerald-500/12 text-emerald-200 border-emerald-500/20",
  info:     "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

const SEV_DOT_GLOW = {
  critical: "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.45)]",
  high:     "bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.35)]",
  medium:   "bg-amber-400 shadow-[0_0_5px_rgba(250,204,21,0.28)]",
  low:      "bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.22)]",
  safe:     "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.28)]",
  info:     "bg-slate-500 shadow-none",
};

function normalizeSocSeverity(ev) {
  const raw = String(ev?.severity ?? ev?.threatLevel ?? "safe").toLowerCase();
  if (["critical", "crit"].includes(raw)) return "critical";
  if (raw === "high") return "high";
  if (raw === "medium") return "medium";
  if (raw === "low") return "low";
  if (["none", "safe", "clear", "ok"].includes(raw)) return "safe";
  if (raw === "info") return "info";
  return "safe";
}

function mergeTrendPulse(uploadTrend = [], threatTrend = []) {
  const idx = new Map();
  const ingest = (arr, key) => {
    arr.forEach((row, i) => {
      const label = row?.hour ?? `t${i}`;
      if (!idx.has(label)) idx.set(label, { t: label, telemetry: 0, anomaly: 0 });
      const cell = idx.get(label);
      if (key === "telemetry") cell.telemetry += Number(row?.count) || 0;
      else cell.anomaly += Number(row?.count) || 0;
    });
  };
  ingest(uploadTrend, "telemetry");
  ingest(threatTrend, "anomaly");
  const rows = [...idx.values()];
  rows.sort((a, b) => String(a.t).localeCompare(String(b.t)));
  return rows;
}

function pulseSeriesFromFeed(telemetryFeed) {
  return telemetryFeed.slice(0, 16).map((ev, i) => {
    const sev = normalizeSocSeverity(ev);
    const threatWt =
      sev === "critical" ? 28 : sev === "high" ? 18 : sev === "medium" ? 10 : sev === "low" ? 5 : 0;
    const sizeWt = Math.min(24, Math.log10(10 + (ev?.size || 0) / 600));
    return {
      t: `${Math.max(0, 15 - i)}m`,
      telemetry: Math.round(18 + sizeWt * 2 + i * 1.2),
      anomaly: Math.round(threatWt + (hashNodeCode(ev?.id) % 7)),
    };
  });
}

function deriveIntegrityTone(raw) {
  const v = String(raw ?? "").toLowerCase();
  if (["verified", "passed", "ok"].some((x) => v.includes(x))) return "text-emerald-400/95";
  if (["pending", "scan"].some((x) => v.includes(x))) return "text-amber-400/95";
  if (["fail", "compromise"].some((x) => v.includes(x))) return "text-rose-400/95";
  return "text-slate-400/90";
}

const SocStreamEventCard = memo(function SocStreamEventCard({ event, navigate }) {
  const sev = normalizeSocSeverity(event);
  const ring = SEV_RING[sev] ?? SEV_RING.info;
  const badge = SEV_BADGE[sev] ?? SEV_BADGE.info;
  const dot = SEV_DOT_GLOW[sev] ?? SEV_DOT_GLOW.info;
  const title = event?.name ?? event?.message ?? "Ingest event";
  const ownerEmail = event?.owner?.email ?? "—";
  const ts = fmtTime(event?.uploadDate ?? event?.createdAt);
  const node = socNodeLabel(event?.id);
  const integrity = event?.integrityStatus ?? "—";
  const telemetryLabel = event?.telemetryStatus ? String(event.telemetryStatus) : "linked";

  const qLogs = encodeURIComponent(title);
  const qUser = encodeURIComponent(ownerEmail);

  return (
    <motion.article
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex min-h-[78px] min-w-0 flex-col rounded-[11px] border border-white/[0.07] bg-gradient-to-b from-[#0c141f]/98 to-[#090f18]/98 px-2 py-1.5 ring-1 ring-white/[0.025] transition-all duration-300 ease-out hover:border-cyan-500/14 hover:shadow-[0_0_18px_-10px_rgba(34,211,238,0.18)] ${ring}`}
    >
      <div className="flex min-w-0 gap-2">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <span className={`relative flex h-2 w-2 rounded-full ${dot}`}>
            {sev === "critical" || sev === "high" ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30" />
            ) : null}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.08] bg-[#060b14]/90 text-cyan-400/90 shadow-inner">
            <FileJson className="h-3.5 w-3.5" aria-hidden />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-x-2 gap-y-0.5">
            <span className={`mt-0.5 shrink-0 rounded-[6px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] leading-none ${badge}`}>
              {sev === "safe" ? "SAFE" : sev.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 pr-1" title={title}>
              <p className="truncate font-mono text-[11.5px] font-semibold leading-snug tracking-tight text-slate-100 antialiased">
                {title}
              </p>
            </div>
          </div>

          <div className="mt-1 flex min-w-0 flex-col gap-0.5 text-[10px] leading-snug">
            <p className="min-w-0 text-[#a1aebf]">
              <span className="text-[#6b7c94]">Owner </span>
              <span className="font-medium text-slate-100/95">{ownerEmail}</span>
            </p>
            <p className="font-mono text-[9px] text-[#8899b4]">node {node}</p>
          </div>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px]">
            <span className="inline-flex items-center gap-1 tabular-nums text-[#b4bfd1]">
              <Clock className="relative top-px h-3 w-3 shrink-0 text-[#718096]" />
              {ts}
            </span>
            <span className={`font-medium ${deriveIntegrityTone(integrity)}`} title={String(integrity)}>
              integ {String(integrity).length > 16 ? `${String(integrity).slice(0, 16)}…` : integrity}
            </span>
            <span className="font-mono text-[9px] text-violet-300/90" title={telemetryLabel}>
              {telemetryLabel.length > 12 ? `${telemetryLabel.slice(0, 12)}…` : telemetryLabel}
            </span>
          </div>

          <div className="mt-1.5 flex min-w-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/uploads`)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-white/[0.09] bg-[#0a121f]/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300/88 shadow-sm transition-[border-color,background-color,color,box-shadow,opacity,transform] duration-200 ease-out hover:border-cyan-400/45 hover:bg-cyan-500/[0.1] hover:text-cyan-100 hover:opacity-100 hover:shadow-[0_0_14px_-3px_rgba(34,211,238,0.4)] active:scale-[0.98]"
            >
              <Eye className="h-3.5 w-3.5" /> Inspect
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/users?q=${qUser}`)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-white/[0.09] bg-[#0a121f]/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300/88 shadow-sm transition-[border-color,background-color,color,box-shadow,opacity,transform] duration-200 ease-out hover:border-violet-400/45 hover:bg-violet-500/[0.1] hover:text-violet-100 hover:opacity-100 hover:shadow-[0_0_14px_-3px_rgba(167,139,250,0.38)] active:scale-[0.98]"
            >
              <GitBranch className="h-3.5 w-3.5" /> Trace
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/logs?q=${qLogs}`)}
              className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-white/[0.09] bg-[#0a121f]/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300/88 shadow-sm transition-[border-color,background-color,color,box-shadow,opacity,transform] duration-200 ease-out hover:border-emerald-400/45 hover:bg-emerald-500/[0.1] hover:text-emerald-100 hover:opacity-100 hover:shadow-[0_0_14px_-3px_rgba(52,211,153,0.35)] active:scale-[0.98]"
            >
              <ScrollText className="h-3.5 w-3.5" /> Logs
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
});

const LiveSocPulseChart = memo(function LiveSocPulseChart({ series }) {
  return (
    <div className="relative flex min-h-[154px] w-full min-w-0 flex-shrink-0 flex-col overflow-hidden rounded-[11px] border border-white/[0.07] bg-gradient-to-b from-[#0a111d]/95 to-[#070d14]/98 py-1 pl-1 pr-0.5 sm:min-h-[162px]">
      <div className="pointer-events-none absolute inset-0 rounded-[11px] bg-[radial-gradient(ellipse_at_50%_-10%,rgba(34,211,238,0.06),transparent_52%)]" />

      <div className="relative flex shrink-0 items-center justify-between gap-2 px-1 pt-0.5">
        <div className="flex min-w-0 items-center gap-3 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
          <span className="flex items-center gap-1 whitespace-nowrap text-cyan-400/95">
            <span className="h-[4px] w-[12px] shrink-0 rounded-full bg-gradient-to-r from-cyan-500/90 to-cyan-400/50 shadow-[0_0_6px_rgba(34,211,238,0.3)]" />
            Telemetry
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-orange-400/95">
            <span className="h-[4px] w-[12px] shrink-0 rounded-full bg-gradient-to-r from-orange-500/90 to-orange-400/45 shadow-[0_0_6px_rgba(251,146,60,0.25)]" />
            Anomaly
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[9px] font-medium text-emerald-400/85">
          <Activity className="h-3 w-3 opacity-90" />
          live
        </span>
      </div>

      <div className="relative mx-auto min-h-[112px] w-full max-w-full min-w-0 flex-1 overflow-hidden px-0.5 pb-0.5">
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={112} minWidth={220}>
            <AreaChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="socTelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <filter id="socPulseLineGlow" x="-35%" y="-35%" width="170%" height="170%">
                  <feGaussianBlur stdDeviation="1.35" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="t" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={4} />
              <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={36} tickMargin={4} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area
                type="natural"
                dataKey="telemetry"
                stroke="#22d3ee"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#socTelGrad)"
                dot={false}
                filter="url(#socPulseLineGlow)"
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
              />
              <Line
                type="natural"
                dataKey="anomaly"
                stroke="#fb923c"
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                strokeOpacity={0.98}
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[108px] flex-col items-center justify-center gap-1">
            <Activity className="h-5 w-5 text-slate-700" />
            <p className="text-[9px] text-slate-600">Awaiting trend samples</p>
          </div>
        )}
      </div>
    </div>
  );
});

const OpsMini = memo(function OpsMini({ label, value, hint, accent = "cyan" }) {
  const acc =
    accent === "rose"
      ? "text-rose-400"
      : accent === "amber"
        ? "text-amber-400"
        : accent === "violet"
          ? "text-violet-400"
          : accent === "emerald"
            ? "text-emerald-400"
            : "text-cyan-400";
  return (
    <div className="min-h-[52px] min-w-0 rounded-[10px] border border-white/[0.07] bg-gradient-to-b from-[#0d1628]/98 to-[#090f18]/98 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-white/[0.09]">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-[#5c6577]">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-[12px] font-bold leading-tight tabular-nums ${acc}`}>{value}</p>
      {hint ? <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-[#546073]">{hint}</p> : null}
    </div>
  );
});

const LiveSocMonitoringBlock = memo(function LiveSocMonitoringBlock({
  telemetryFeed,
  dbOnline,
  stats,
  health,
  d,
  sysHealth,
  threatAlerts,
  nodesVal,
  uploadTrend,
  threatTrend,
}) {
  const navigate = useNavigate();
  const pulseMerged = useMemo(() => {
    const m = mergeTrendPulse(uploadTrend, threatTrend);
    if (m.length) return m;
    return pulseSeriesFromFeed(telemetryFeed);
  }, [uploadTrend, threatTrend, telemetryFeed]);

  const wsConnections = stats?.wsConnections ?? health?.wsConnections ?? "—";
  const apiPerMin = stats?.apiRequestsPerMin ?? health?.apiRequestsPerMin ?? "—";
  const storageMb = d?.storageUsage?.usedMb != null ? `${d.storageUsage.usedMb} MB` : "—";
  const dbLat = sysHealth?.dbLatencyMs ?? health?.dbLatencyMs ?? "—";

  const uploadsLastWindow = useMemo(() => {
    const arr = uploadTrend ?? [];
    const sum = arr.reduce((a, x) => a + (Number(x?.count) || 0), 0);
    const hrs = Math.max(1, arr.length || 1);
    const perHr = sum / hrs;
    const perMin = perHr / 60;
    return { sum, perMin };
  }, [uploadTrend]);

  const encryptedPct = useMemo(() => {
    if (!telemetryFeed.length) return null;
    const ok = telemetryFeed.filter((f) => {
      const e = String(f?.encryptionStatus ?? "").toLowerCase();
      return e.includes("encrypt") || e.includes("aes") || e.includes("vault") || e.includes("secure") || e.includes("gcm");
    }).length;
    return Math.round((ok / telemetryFeed.length) * 100);
  }, [telemetryFeed]);

  const integrityPct = useMemo(() => {
    if (!telemetryFeed.length) return null;
    const ok = telemetryFeed.filter((f) =>
      ["verified", "passed"].includes(String(f?.integrityStatus ?? "").toLowerCase()),
    ).length;
    return Math.round((ok / telemetryFeed.length) * 100);
  }, [telemetryFeed]);

  const anomalyScore = useMemo(() => {
    if (!telemetryFeed.length && threatAlerts == null) return "—";
    const hi = telemetryFeed.filter((f) =>
      ["critical", "high"].includes(String(f?.threatLevel ?? "").toLowerCase()),
    ).length;
    const base = threatAlerts != null ? Math.min(72, Number(threatAlerts) * 3) : 0;
    return Math.min(100, Math.round(base + hi * 10));
  }, [threatAlerts, telemetryFeed]);

  const relaySync = nodesVal != null ? `${nodesVal}/14` : "—";
  const throughputHint =
    uploadsLastWindow.perMin > 0 ? `${uploadsLastWindow.perMin.toFixed(2)} evt/min est.` : "from analytics";

  const displayedFeed = useMemo(() => telemetryFeed.slice(0, 8), [telemetryFeed]);

  return (
    <section className="flex min-w-0 flex-col self-start overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#101827] via-[#0c1424] to-[#090f18] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-3.5 lg:col-span-2 lg:p-4">
      <header className="mb-2 flex min-w-0 flex-col gap-2 border-b border-white/[0.06] pb-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C7CCD8]">Live SOC Monitoring</h2>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <p className="mt-0.5 max-w-xl text-[10.5px] leading-snug text-[#5a6578]">
            Realtime forensic telemetry & anomaly stream
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <LivePulse connected={dbOnline} />
          <div className="rounded-lg border border-white/[0.06] bg-[#0a101c] px-2.5 py-1.5 text-[10px]">
            <span className="text-[#4B5563]">Edge latency </span>
            <span className="font-mono font-semibold text-cyan-400/95">{dbLat}ms</span>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0a101c] px-2.5 py-1.5 text-[10px]">
            <span className="text-[#4B5563]">Events/min </span>
            <span className="font-mono font-semibold text-[#E5E7EB]">
              {uploadsLastWindow.perMin > 0 ? uploadsLastWindow.perMin.toFixed(1) : "—"}
            </span>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-[#0a101c] px-2.5 py-1.5 text-[10px]">
            <span className="text-[#4B5563]">Sync </span>
            <span className={`font-semibold ${nodesVal != null && nodesVal >= 9 ? "text-emerald-400" : "text-amber-400/90"}`}>
              {nodesVal != null && nodesVal >= 9 ? "nominal" : nodesVal != null ? "watch" : "—"}
            </span>
          </div>
        </div>
      </header>

      <div
        className={[
          "grid min-w-0 gap-2 overflow-x-hidden",
          "grid-cols-1",
          "lg:grid-cols-2 lg:grid-rows-2 lg:items-start lg:gap-x-2.5 lg:gap-y-2",
          "xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)_minmax(220px,0.88fr)] xl:grid-rows-1 xl:gap-2.5 xl:items-start",
        ].join(" ")}
      >
        {/* LEFT — event stream (~42–47% at xl via 1.65fr) */}
        <div
          className={[
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            "max-h-[min(248px,36vh)] sm:max-h-[min(258px,37vh)] lg:max-h-[min(268px,38vh)] xl:max-h-[min(262px,37vh)]",
            "lg:row-span-2 lg:row-start-1 lg:col-start-1",
            "xl:row-span-1",
          ].join(" ")}
        >
          <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
            <span className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
              Realtime event stream
            </span>
            <span className="shrink-0 font-mono text-[10px] text-[#374151]">{displayedFeed.length} visible</span>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
            <AnimatePresence initial={false}>
              {displayedFeed.length > 0 ? (
                <div className="flex min-w-0 flex-col gap-1.5 pb-1">
                  {displayedFeed.map((ev, i) => (
                    <SocStreamEventCard key={ev.id ?? `${ev.name}-${i}`} event={ev} navigate={navigate} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center px-2 py-7 text-center"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-[#0c1322]">
                    <Radio className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No stream events</p>
                  <p className="mt-1 max-w-[240px] text-xs text-slate-600">
                    Uploads and scans appear here instantly via websocket refresh & polling.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER — pulse chart */}
        <div
          className={[
            "flex min-w-0 flex-col overflow-hidden",
            "lg:col-start-2 lg:row-start-1",
            "xl:col-auto xl:row-auto",
          ].join(" ")}
        >
          <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
              Threat activity pulse
            </span>
            <span className="max-w-full truncate text-right text-[10px] text-[#374151]">{throughputHint}</span>
          </div>
          <LiveSocPulseChart series={pulseMerged} />
          <p className="mt-0.5 shrink-0 text-center text-[8px] leading-tight text-[#3F4756]">
            Analytics time-series merged with recent ingest telemetry
          </p>
        </div>

        {/* RIGHT — ops rail */}
        <div
          className={[
            "flex min-w-0 flex-col gap-1 overflow-hidden",
            "lg:col-start-2 lg:row-start-2",
            "xl:col-auto xl:row-auto",
          ].join(" ")}
        >
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
            Infrastructure rail
          </span>
          <div className="grid min-w-0 grid-cols-2 gap-1">
            <OpsMini label="WebSocket" value={wsConnections} hint={dbOnline ? "gateway up" : "degraded"} accent="emerald" />
            <OpsMini label="Active nodes" value={nodesVal ?? "—"} hint="secure mesh" accent="cyan" />
            <OpsMini label="Relay sync" value={relaySync} hint="shard quorum" accent="violet" />
            <OpsMini
              label="Encrypted traffic"
              value={encryptedPct != null ? `${encryptedPct}%` : "—"}
              hint="ingest sample"
              accent="cyan"
            />
            <OpsMini
              label="Upload throughput"
              value={uploadsLastWindow.sum ? `${uploadsLastWindow.sum}/window` : "—"}
              hint="analytics buckets"
              accent="emerald"
            />
            <OpsMini label="API req/min" value={apiPerMin} hint="control plane" accent="cyan" />
            <OpsMini label="Storage" value={storageMb} hint="vault footprint" accent="violet" />
            <OpsMini
              label="Integrity OK"
              value={integrityPct != null ? `${integrityPct}%` : "—"}
              hint="recent samples"
              accent="emerald"
            />
            <OpsMini
              label="Anomaly score"
              value={anomalyScore}
              hint="threat-weighted"
              accent={typeof anomalyScore === "number" && anomalyScore > 55 ? "rose" : "amber"}
            />
          </div>
        </div>
      </div>
    </section>
  );
});

function UserRow({ user, onView }) {
  const initials = getInitials(user.fullName, user.email);
  const colors = ["bg-cyan-500/20 text-cyan-300", "bg-violet-500/20 text-violet-300", "bg-emerald-500/20 text-emerald-300", "bg-amber-500/20 text-amber-300"];
  const avatarColor = colors[(user.email?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <tr
      onClick={() => onView?.(user)}
      className="group cursor-pointer border-b border-white/[0.035] transition-[background-color,box-shadow] duration-300 ease-out last:border-0 hover:bg-white/[0.045] hover:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14),0_0_28px_-14px_rgba(34,211,238,0.22)]"
    >
      <td className="py-2 pl-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.45)] ring-2 ring-black/25 ring-offset-1 ring-offset-[#111827]/80 ${avatarColor}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#E5E7EB] group-hover:text-white">{user.fullName || user.email}</p>
            <p className="truncate text-[10px] text-[#5c677a]">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-2 text-center">
        <span className="inline-flex min-w-[2rem] justify-center rounded-md border border-white/[0.07] bg-white/[0.06] px-2 py-0.5 text-xs font-mono font-semibold tabular-nums text-[#d4dce8] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/[0.04]">
          {user.uploadCount ?? 0}
        </span>
      </td>
      <td className="py-2 pr-4 text-right text-[10px] font-medium tabular-nums text-[#a8b3c4]">
        {fmtTime(user.lastActivity || user.createdAt)}
      </td>
    </tr>
  );
}

function uploadForensicTier(file) {
  const t = String(file?.threatLevel ?? "none").toLowerCase();
  if (t === "critical" || t === "high") return "high";
  if (t === "medium") return "medium";
  return "low";
}

const RECENT_UPLOAD_GLASS_BTN =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.055] backdrop-blur-sm shadow-sm outline-none transition-[border-color,background-color,color,box-shadow,transform] duration-300 ease-out hover:border-white/[0.14] hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-cyan-400/35 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const RecentUploadActions = memo(function RecentUploadActions({
  file,
  tier,
  navigate,
  toolbarHot,
  menuOpen,
  onMenuToggle,
}) {
  const fileId = file?.id;
  const fname = file?.name ?? "";
  const ownerEmail = file?.owner?.email ?? "";

  const goUploads = useCallback(() => {
    const q = encodeURIComponent(fname || String(fileId ?? ""));
    navigate(`/admin/uploads?q=${q}`);
  }, [navigate, fname, fileId]);

  const goLogs = useCallback(() => {
    navigate(`/admin/logs?q=${encodeURIComponent(fname)}`);
  }, [navigate, fname]);

  const goUsers = useCallback(() => {
    navigate(`/admin/users?q=${encodeURIComponent(ownerEmail)}`);
  }, [navigate, ownerEmail]);

  const handleDownload = useCallback(async () => {
    if (!fileId) return;
    try {
      const { blob, filename } = await downloadSocFile(fileId, fname || "secure-object.bin");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || fname || "secure-object.bin";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn(normalizeSocError(err).message ?? "Download failed");
    }
    onMenuToggle(false);
  }, [fileId, fname, onMenuToggle]);

  const secondaryMenuItems = useMemo(() => {
    if (tier === "low") {
      return [
        { key: "insp", label: "Inspect logs", Icon: FileSearch, run: goLogs },
        { key: "tr", label: "Trace user", Icon: GitBranch, run: goUsers },
      ];
    }
    return [
      { key: "view", label: "View uploads", Icon: Eye, run: goUploads },
      { key: "dl", label: "Download", Icon: Download, run: () => void handleDownload() },
    ];
  }, [tier, goLogs, goUsers, goUploads, handleDownload]);

  const fullMobileItems = useMemo(
    () => [
      { key: "view", label: "View", Icon: Eye, run: goUploads },
      { key: "insp", label: "Inspect", Icon: FileSearch, run: goLogs },
      { key: "tr", label: "Trace", Icon: GitBranch, run: goUsers },
      { key: "dl", label: "Download", Icon: Download, run: () => void handleDownload() },
    ],
    [goUploads, goLogs, goUsers, handleDownload],
  );

  const fadeHot = toolbarHot;

  let primary = null;
  if (tier === "low") {
    primary = (
      <>
        <button
          type="button"
          title="View in upload monitoring"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-cyan-400/95 hover:shadow-[0_0_12px_-4px_rgba(34,211,238,0.35)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            goUploads();
          }}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">View</span>
        </button>
        <button
          type="button"
          title="Download artifact"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-emerald-400/95 hover:shadow-[0_0_12px_-4px_rgba(52,211,153,0.3)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            void handleDownload();
          }}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">DL</span>
        </button>
      </>
    );
  } else if (tier === "medium") {
    primary = (
      <>
        <button
          type="button"
          title="Inspect — SIEM logs"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-violet-400/95 hover:shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            goLogs();
          }}
        >
          <FileSearch className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">Inspect</span>
        </button>
        <button
          type="button"
          title="Trace owner"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-cyan-400/95 hover:shadow-[0_0_12px_-4px_rgba(34,211,238,0.3)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            goUsers();
          }}
        >
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">Trace</span>
        </button>
      </>
    );
  } else {
    primary = (
      <>
        <button
          type="button"
          title="Inspect — SIEM logs"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-violet-400/95 hover:shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            goLogs();
          }}
        >
          <FileSearch className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">Inspect</span>
        </button>
        <button
          type="button"
          title="Trace owner"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 gap-1 px-1.5 text-cyan-400/95 hover:shadow-[0_0_12px_-4px_rgba(34,211,238,0.3)] xl:min-w-0 xl:px-2`}
          onClick={(e) => {
            e.stopPropagation();
            goUsers();
          }}
        >
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden xl:inline text-[10px] font-semibold text-slate-200">Trace</span>
        </button>
        <span
          className="hidden items-center gap-0.5 rounded-md border border-rose-500/28 bg-rose-500/[0.09] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-200/95 lg:inline-flex"
          title="Elevated threat — review containment runbooks"
        >
          <ShieldAlert className="h-3 w-3 shrink-0 opacity-90" />
          Q+
        </span>
      </>
    );
  }

  return (
    <div className="relative flex min-h-[2rem] items-center justify-end gap-1">
      <div
        className={[
          "hidden items-center justify-end gap-1 transition-[opacity,transform] duration-300 ease-out lg:flex",
          fadeHot ? "translate-x-0 opacity-100" : "translate-x-1 opacity-[0.42]",
        ].join(" ")}
      >
        {primary}
        <button
          type="button"
          title="More"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-7 w-7 shrink-0 text-[#9ca3af] hover:text-slate-100`}
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle(!menuOpen);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="relative lg:hidden">
        <button
          type="button"
          className={`${RECENT_UPLOAD_GLASS_BTN} h-8 gap-1 px-2 text-[#9ca3af]`}
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle(!menuOpen);
          }}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-semibold tracking-wide text-slate-400">Acts</span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-[80] mt-1 min-w-[176px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#151d2e]/96 py-1 shadow-xl shadow-black/45 backdrop-blur-lg lg:bottom-full lg:top-auto lg:mb-1 lg:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/[0.06] pb-1 lg:hidden">
              {fullMobileItems.map(({ key, label, Icon, run }) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/[0.06]"
                  onClick={(e) => {
                    e.stopPropagation();
                    run();
                    onMenuToggle(false);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
            <div className="hidden lg:block">
              <p className="px-3 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-wider text-[#64748b]">More</p>
              {secondaryMenuItems.map(({ key, label, Icon, run }) => (
                <button
                  key={key}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/[0.06]"
                  onClick={(e) => {
                    e.stopPropagation();
                    run();
                    onMenuToggle(false);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

const UploadRow = memo(function UploadRow({
  file,
  idx,
  selectedKey,
  onSelectUploadKey,
  actionsMenuKey,
  onSetActionsMenuKey,
  navigate,
}) {
  const tStyle = THREAT_STYLE[file.threatLevel?.toLowerCase()] ?? THREAT_STYLE.none;
  const [showTip, setShowTip] = useState(false);
  const [hovered, setHovered] = useState(false);
  const nameRef = useRef(null);
  const needsTip = (file.name ?? "").length > 28;
  const rowKey = String(file?.id ?? idx);
  const tier = uploadForensicTier(file);
  const isSelected = selectedKey === rowKey;
  const menuOpen = actionsMenuKey === rowKey;
  const toolbarHot = hovered || isSelected || menuOpen;

  return (
    <tr
      className={[
        "group/upload-row cursor-pointer border-b border-white/[0.035] transition-[background-color,box-shadow] duration-300 ease-out last:border-0",
        isSelected
          ? "bg-cyan-500/[0.09] shadow-[inset_4px_0_0_rgba(34,211,238,0.85),0_0_20px_-12px_rgba(34,211,238,0.12)]"
          : "hover:bg-white/[0.05] hover:shadow-[inset_3px_0_0_rgba(34,211,238,0.42)]",
      ].join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelectUploadKey(isSelected ? null : rowKey)}
    >
      <td className="py-2.5 pl-4">
        <div
          className="relative inline-block max-w-[180px]"
          onMouseEnter={() => needsTip && setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <p ref={nameRef} className="truncate font-mono text-[11px] text-[#D1D5DB]">
            {needsTip ? file.name.slice(0, 27) + "…" : file.name}
          </p>
          {showTip ? (
            <div className="absolute -top-7 left-0 z-50 whitespace-nowrap rounded bg-[#1F2937] px-2 py-1 text-[10px] text-white shadow-lg ring-1 ring-white/10">
              {file.name}
            </div>
          ) : null}
        </div>
      </td>
      <td className="py-2.5 text-[10px] text-[#6B7280]">{file.owner?.email?.split("@")[0] ?? "—"}</td>
      <td className="py-2.5 font-mono text-[10px] text-[#4B5563]">{fmtBytes(file.size)}</td>
      <td className="py-2.5">
        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${tStyle}`}>
          {file.threatLevel ?? "NONE"}
        </span>
      </td>
      <td className="py-2.5 text-[10px] font-medium tabular-nums tracking-tight text-[#9eb0c4]">{fmtUploadedAt(file.uploadDate)}</td>
      <td className="relative w-[1%] whitespace-nowrap py-2.5 pl-2 pr-3 text-right align-middle">
        <RecentUploadActions
          file={file}
          tier={tier}
          navigate={navigate}
          toolbarHot={toolbarHot}
          menuOpen={menuOpen}
          onMenuToggle={(open) => onSetActionsMenuKey(open ? rowKey : null)}
        />
      </td>
    </tr>
  );
});

function UserModal({ user, onClose }) {
  if (!user) return null;
  const initials = getInitials(user.fullName, user.email);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-lg font-bold text-cyan-400 ring-1 ring-cyan-400/20">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-white">{user.fullName || "—"}</p>
                <p className="text-xs text-[#6B7280]">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-[#4B5563] hover:bg-white/5 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            {[
              { label: "Uploads",      value: user.uploadCount ?? 0 },
              { label: "Joined",       value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—" },
              { label: "Last Active",  value: fmtTime(user.lastActivity || user.createdAt) },
              { label: "Role",         value: "User" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280]">{r.label}</span>
                <span className="font-medium text-[#E5E7EB]">{r.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-xs font-medium text-[#9CA3AF] hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ChartEmpty({ label }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <BarChart3 className="h-6 w-6 text-slate-700" />
      <p className="text-[11px] text-slate-600">{label}</p>
    </div>
  );
}

const PlatformAnalyticsGrid = memo(function PlatformAnalyticsGrid({ uploadTrend, sessionTrend, threatTrend }) {
  const chartWrap = "relative flex h-36 w-full min-h-[9rem] items-center justify-center";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
      <div className="flex min-h-0 flex-col rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#121926] to-[#0e1520] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <p className="text-[11px] font-semibold text-[#9CA3AF]">Upload Activity</p>
          <span className="rounded-md bg-cyan-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-cyan-400">12h</span>
        </div>
        <div className={chartWrap}>
          {uploadTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uploadTrend} margin={ANALYTICS_CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 6" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={6} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={32} tickMargin={4} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
                <Bar
                  dataKey="count"
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive
                  animationDuration={CHART_ANIM_MS}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No upload data yet" />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#121926] to-[#0e1520] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <p className="text-[11px] font-semibold text-[#9CA3AF]">Active Sessions</p>
          <span className="rounded-md bg-emerald-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">12h</span>
        </div>
        <div className={chartWrap}>
          {sessionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionTrend} margin={ANALYTICS_CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 6" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={6} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={32} tickMargin={4} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: "#34d399", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#34d399"
                  strokeWidth={2}
                  strokeLinecap="round"
                  dot={false}
                  activeDot={{ r: 3, fill: "#34d399" }}
                  isAnimationActive
                  animationDuration={CHART_ANIM_MS}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No session data yet" />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#121926] to-[#0e1520] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <p className="text-[11px] font-semibold text-[#9CA3AF]">Threat Events</p>
          <span className="rounded-md bg-rose-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-rose-400">12h</span>
        </div>
        <div className={chartWrap}>
          {threatTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={threatTrend} margin={ANALYTICS_CHART_MARGIN}>
                <defs>
                  <linearGradient id="thrG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={6} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={32} tickMargin={4} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: "#f87171", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f87171"
                  fill="url(#thrG2)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  dot={false}
                  activeDot={{ r: 3, fill: "#f87171" }}
                  isAnimationActive
                  animationDuration={CHART_ANIM_MS}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No threat data yet" />
          )}
        </div>
      </div>
    </div>
  );
});

/* ─────────────────────────── main page ──────────────────────────── */

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { overview, stats, health, loading, error, lastRefresh, refresh } = useAdminStats();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUploadKey, setSelectedUploadKey] = useState(null);
  const [uploadActionsMenuKey, setUploadActionsMenuKey] = useState(null);
  const [sortCol, setSortCol] = useState("uploadDate");
  const [sortDir, setSortDir] = useState("desc");

  const d = overview;

  const telemetryFeed = useMemo(() => {
    const items = d?.recentUploads ?? [];
    return [...items].reverse();
  }, [d?.recentUploads]);

  const recentUsers   = useMemo(() => d?.recentUsers   ?? stats?.recentUsers   ?? [], [d, stats]);
  const recentUploads = useMemo(() => {
    const items = d?.recentUploads ?? stats?.recentUploads ?? [];
    return [...items].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [d, stats, sortCol, sortDir]);

  const uploadTrend  = stats?.uploadsTrend  ?? [];
  const threatTrend  = stats?.threatsTrend  ?? [];
  const sessionTrend = stats?.sessionsTrend ?? [];

  const totalUsers     = d?.totalUsers     ?? stats?.totalUsers     ?? null;
  const activeUsers    = d?.activeUsers    ?? stats?.activeUsers    ?? null;
  const uploadedFiles  = d?.uploadedFiles  ?? stats?.uploadedFiles  ?? null;
  const threatAlerts   = d?.threatAlerts   ?? stats?.threatAlerts   ?? null;
  const aiDetections   = d?.aiDetections   ?? stats?.aiDetections   ?? null;
  const activeSessions = d?.activeSessions ?? stats?.activeSessions ?? null;

  const sysHealth = d?.systemHealth ?? health;
  const cpuVal  = sysHealth?.cpuUsage     ?? stats?.cpuUsage    ?? null;
  const memVal  = sysHealth?.memoryPercent ?? stats?.memoryUsage ?? null;
  const apiVal  = stats?.apiHealth ?? null;
  const nodesVal = stats?.secureNodes ?? null;

  const dbOnline = (sysHealth?.database ?? health?.database) === "online";

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronDown className="h-3 w-3 text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-cyan-400" />
      : <ChevronDown className="h-3 w-3 text-cyan-400" />;
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[1680px] min-w-0 space-y-5 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.1rem] font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-0.5 text-xs text-[#4B5563]">Cloud Telecom Cyber Forensics · Enterprise SOC</p>
        </div>
        <div className="flex items-center gap-3">
          <LivePulse connected={dbOnline} />
          {lastRefresh && (
            <span className="hidden text-[10px] text-[#374151] sm:block">
              Synced {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-[#6B7280] transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-medium text-rose-400">Dashboard data unavailable</p>
              <p className="mt-0.5 text-xs text-rose-400/70">{error}</p>
              <p className="mt-0.5 text-[10px] text-rose-400/50">Restart the backend server and refresh to load real data.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-xs text-[#4B5563]">Loading platform data…</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Section 1: KPI Grid ── */}
          <section>
            <SectionTitle icon={Shield}>Global Security Overview</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <StatCard icon={Users}      label="Total Users"     value={totalUsers     ?? (loading ? "…" : "—")} color="cyan"    sub={`${activeUsers ?? 0} active`} />
              <StatCard icon={Upload}     label="Uploaded Files"  value={uploadedFiles  ?? (loading ? "…" : "—")} color="violet"  />
              <StatCard icon={ShieldAlert} label="Threat Alerts"  value={threatAlerts   ?? (loading ? "…" : "—")} color="rose"    />
              <StatCard icon={Brain}      label="AI Detections"   value={aiDetections   ?? (loading ? "…" : "—")} color="amber"   />
              <StatCard icon={Globe}      label="Active Sessions" value={activeSessions ?? (loading ? "…" : "—")} color="sky"     />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Cpu}       label="CPU Usage"    value={cpuVal  !== null ? `${cpuVal}%`  : (loading ? "…" : "—")} color={cpuVal  > 80 ? "rose" : "cyan"}    />
              <StatCard icon={HardDrive} label="Memory"       value={memVal  !== null ? `${memVal}%`  : (loading ? "…" : "—")} color={memVal  > 85 ? "amber" : "emerald"} />
              <StatCard icon={Zap}       label="API Health"   value={apiVal  !== null ? `${apiVal}%`  : (loading ? "…" : "—")} color="emerald" />
              <StatCard icon={Server}    label="Secure Nodes" value={nodesVal ?? (loading ? "…" : "—")}                        color="blue"    />
            </div>
          </section>

          {/* ── Section 2+5: SOC Feed + System Health ── */}
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">

            <LiveSocMonitoringBlock
              telemetryFeed={telemetryFeed}
              dbOnline={dbOnline}
              stats={stats}
              health={health}
              d={d}
              sysHealth={sysHealth}
              threatAlerts={threatAlerts}
              nodesVal={nodesVal}
              uploadTrend={uploadTrend}
              threatTrend={threatTrend}
            />

            {/* System Health — proportional to Live SOC row height */}
            <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.085] bg-gradient-to-b from-[#141d30]/98 via-[#101928] to-[#0b121f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_0_40px_-28px_rgba(34,211,238,0.06)] transition-[border-color,box-shadow] duration-300 hover:border-cyan-500/15 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_48px_-24px_rgba(34,211,238,0.1)] sm:p-5">
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_100%_0%,rgba(34,211,238,0.045),transparent_48%)]" />

              <div className="relative shrink-0 border-b border-white/[0.055] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Server className="h-4 w-4 text-cyan-400" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e2e8f0]">System Health</h2>
                    <p className="mt-0.5 text-[10px] font-medium text-[#64748b]">Control plane & service mesh</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-3 flex flex-col gap-4">
                {/* ZONE — Progress metrics */}
                <div className="shrink-0 space-y-3">
                  {[
                    { label: "CPU Usage",    value: cpuVal,  color: cpuVal  > 80 ? "rose" : "cyan" },
                    { label: "Memory Usage", value: memVal,  color: memVal  > 85 ? "amber" : "emerald" },
                    { label: "API Health",   value: apiVal,  color: "emerald" },
                    { label: "Secure Nodes", value: nodesVal != null ? Math.round((nodesVal / 14) * 100) : null, color: "cyan" },
                  ].map((m) => (
                    <HealthBar key={m.label} label={m.label} value={m.value ?? 0} color={m.color} />
                  ))}
                </div>

                {/* ZONE — Mini metrics */}
                {(sysHealth || health) ? (
                  <div className="shrink-0 rounded-[11px] border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-[#0c131f]/92 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-inset ring-white/[0.025]">
                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#64748b]">Runtime metrics</p>
                    <div className="space-y-2.5">
                      {[
                        { label: "DB Latency", val: `${sysHealth?.dbLatencyMs ?? health?.dbLatencyMs ?? "—"}ms`, color: "text-cyan-400" },
                        { label: "Uptime",     val: fmtUptime(sysHealth?.uptime ?? health?.uptimeSeconds), color: "text-emerald-400" },
                        { label: "Memory",     val: `${sysHealth?.memoryUsedMb ?? health?.memoryUsedMb ?? "—"} / ${sysHealth?.memoryTotalMb ?? health?.memoryTotalMb ?? "—"} MB`, color: "text-violet-400" },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between gap-4 border-b border-white/[0.035] pb-2.5 last:border-0 last:pb-0">
                          <span className="text-[11px] font-semibold text-[#a8b8cc]">{r.label}</span>
                          <span className={`max-w-[55%] text-right font-mono text-[11px] font-bold tabular-nums tracking-tight ${r.color}`}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* ZONE — Service status */}
                <div className="flex flex-col border-t border-white/[0.04] pt-3">
                  <p className="mb-1.5 shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[#64748b]">Service status</p>
                  <ul className="flex flex-col divide-y divide-white/[0.035]">
                    {[
                      { label: "Database",          online: dbOnline,                                     unknown: !(sysHealth || health) },
                      { label: "WebSocket Gateway", online: true,  unknown: false },
                      { label: "Forensic Engine",   online: true,  unknown: false },
                      { label: "Encryption Vault",  online: true,  unknown: false },
                      { label: "Relay Sync",        online: nodesVal != null ? nodesVal > 8 : true, unknown: nodesVal == null },
                    ].map((s) => (
                      <li key={s.label} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                        <span className="min-w-0 text-[11px] font-semibold text-[#b6c3d4]">{s.label}</span>
                        <span className={`flex shrink-0 items-center gap-2 text-[11px] font-bold tabular-nums ${s.unknown ? "text-slate-500" : s.online ? "text-emerald-400" : "text-amber-400"}`}>
                          <span className={`relative flex h-2 w-2 shrink-0 rounded-full ${s.unknown ? "bg-slate-600" : s.online ? "bg-emerald-400" : "bg-amber-400"}`}>
                            {!s.unknown && s.online ? (
                              <span className="absolute -inset-[3px] rounded-full bg-emerald-400/20 motion-safe:animate-[pulse_2.8s_ease-in-out_infinite]" />
                            ) : null}
                          </span>
                          {s.unknown ? "Unknown" : s.online ? "Online" : "Degraded"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* ── Section 3+4: Threat Intelligence + User Activity ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

            {/* Threat Intelligence */}
            <section className="rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#111827] to-[#0e1520] p-4 sm:p-5">
              <SectionTitle icon={ShieldAlert}>Threat Intelligence</SectionTitle>

              <div className="mb-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Total",        value: threatAlerts ?? "—",                                                                              color: "text-rose-400",   tint: "from-rose-500/[0.08] border-rose-500/12" },
                  { label: "Failed Logins",value: stats?.failedLogins ?? (threatAlerts != null ? Math.round(threatAlerts * 0.4) : "—"),             color: "text-orange-400", tint: "from-orange-500/[0.08] border-orange-500/12" },
                  { label: "Blocked IPs",  value: stats?.blockedIps   ?? (threatAlerts != null ? Math.round(threatAlerts * 0.2) : "—"),             color: "text-amber-400",  tint: "from-amber-500/[0.08] border-amber-500/12" },
                ].map((t) => (
                  <div
                    key={t.label}
                    className={`rounded-xl border bg-gradient-to-br ${t.tint} to-[#0a111d]/95 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.042)] ring-1 ring-inset ring-white/[0.035]`}
                  >
                    <p className={`text-lg font-bold tabular-nums sm:text-xl ${t.color}`}>{t.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-[#64748b]">{t.label}</p>
                  </div>
                ))}
              </div>

              <div className="relative flex h-36 w-full items-center justify-center">
                {threatTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={threatTrend} margin={ANALYTICS_CHART_MARGIN}>
                      <defs>
                        <linearGradient id="threatG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="hour" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={6} />
                      <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={32} tickMargin={4} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: "#f87171", strokeWidth: 1, strokeOpacity: 0.3 }} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#f87171"
                        strokeWidth={2}
                        strokeLinecap="round"
                        fill="url(#threatG)"
                        dot={false}
                        activeDot={{ r: 3, fill: "#f87171" }}
                        isAnimationActive
                        animationDuration={CHART_ANIM_MS}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <ChartEmpty label="No threat trend data yet" />}
              </div>

              <div className="mt-3 space-y-1.5 border-t border-white/[0.045] pt-2.5">
                {[
                  { label: "Critical", pct: 12, color: "bg-rose-500" },
                  { label: "High",     pct: 28, color: "bg-orange-500" },
                  { label: "Medium",   pct: 38, color: "bg-amber-500" },
                  { label: "Low",      pct: 22, color: "bg-cyan-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-[3.25rem] shrink-0 font-medium text-[#94a3b8]">{s.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-white/[0.06] h-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.82, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full shadow-[0_0_8px_-3px_rgba(255,255,255,0.15)] ${s.color}`}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums text-[#94a3b8]">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* User Activity Center */}
            <section className="rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#111827] to-[#0e1520] p-4 sm:p-5">
              <SectionTitle
                icon={Users}
                action={
                  <span className="text-[10px] text-[#4B5563]">Click row to inspect</span>
                }
              >
                User Activity Center
              </SectionTitle>

              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                <div className="max-h-[280px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-white/[0.06] bg-[#131c2d]/92 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/[0.05] ring-inset">
                      <th className="py-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#4B5563]">User</th>
                      <th className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#4B5563]">Files</th>
                      <th className="py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[#4B5563]">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.slice(0, 6).map((u) => (
                      <UserRow key={u.id} user={u} onView={setSelectedUser} />
                    ))}
                    {recentUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-10 text-center">
                          <Users className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                          <p className="text-xs text-slate-600">No users registered yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  Zero-trust sessions enforced
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {activeSessions ?? "—"} online
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ── Section: Recent Uploads ── */}
          {recentUploads.length > 0 && (
            <section>
              <SectionTitle icon={Upload}>
                Recent Uploads
                <span className="ml-2 rounded-md bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                  {recentUploads.length} files
                </span>
              </SectionTitle>

              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111827]">
                <div
                  className={
                    uploadActionsMenuKey
                      ? "overflow-x-auto overflow-y-visible custom-scrollbar"
                      : "max-h-[min(420px,52vh)] overflow-x-auto overflow-y-auto custom-scrollbar"
                  }
                >
                  <table className="w-full min-w-[640px] text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-white/[0.06] bg-[#161f31]/92 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/[0.06] ring-inset">
                        {[
                          { key: "name",        label: "File" },
                          { key: "owner",       label: "Owner" },
                          { key: "size",        label: "Size" },
                          { key: "threatLevel", label: "Threat" },
                          { key: "uploadDate",  label: "Uploaded" },
                          { key: null,          label: "Actions" },
                        ].map((col) => (
                          <th
                            key={col.label}
                            onClick={() => col.key && handleSort(col.key)}
                            className={`${col.key ? "px-4 py-2.5 text-left" : "w-[1%] whitespace-nowrap px-3 py-2.5 text-right"} text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] ${col.key ? "cursor-pointer select-none hover:text-[#9CA3AF] transition-colors" : "cursor-default"}`}
                          >
                            <div className={`flex items-center gap-1 ${col.key ? "" : "justify-end"}`}>
                              {col.label}
                              {col.key && <SortIcon col={col.key} />}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentUploads.slice(0, 10).map((f, i) => (
                        <UploadRow
                          key={f.id ?? i}
                          file={f}
                          idx={i}
                          selectedKey={selectedUploadKey}
                          onSelectUploadKey={setSelectedUploadKey}
                          actionsMenuKey={uploadActionsMenuKey}
                          onSetActionsMenuKey={setUploadActionsMenuKey}
                          navigate={navigate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── Section 6: Analytics ── */}
          <section>
            <SectionTitle icon={BarChart3}>Platform Analytics</SectionTitle>
            <PlatformAnalyticsGrid uploadTrend={uploadTrend} sessionTrend={sessionTrend} threatTrend={threatTrend} />
          </section>
        </>
      )}

      {/* ── User detail modal ── */}
      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}

      {/* ── Custom scrollbar styles ── */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.14); border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.22); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.18) transparent; }
      `}</style>
    </div>
  );
}
