import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { socApi } from "@/services/apiClient";
import { connectTelemetrySocket } from "@/services/websocket/telemetrySocket";
import { normalizeSocError } from "@/services/apiErrorHandler";

const REFRESH_MS = 8_000;
const CHART_ANIM_MS = 560;
const EVENT_CAP = 42;

const NODES = [
  { id: "FTTH-NODE-01", region: "EU-North", type: "Edge", latency: 12 },
  { id: "FTTH-NODE-02", region: "EU-Central", type: "Core", latency: 8 },
  { id: "FTTH-NODE-03", region: "EU-South", type: "Edge", latency: 18 },
  { id: "RELAY-04", region: "Backbone", type: "Relay", latency: 5 },
  { id: "RELAY-05", region: "Backbone", type: "Relay", latency: 7 },
  { id: "GW-WEST", region: "West DC", type: "Gateway", latency: 22 },
];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(31, h) + str.charCodeAt(i);
  return Math.abs(h);
}

function useOscillate(base, amp, period) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setVal(Math.round(base + amp * Math.sin((Date.now() / 1000) * ((2 * Math.PI) / period))));
    }, 2000);
    return () => clearInterval(id);
  }, [base, amp, period]);
  return val;
}

/** Stable pseudo-live telemetry per node (no Math.random per paint). */
function useNodeTelemetry(nodeId, baseLatency) {
  const seed = useMemo(() => hashSeed(nodeId), [nodeId]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const phase = tick * 0.35 + (seed % 17) * 0.2;
    const jitter = Math.sin(phase) * (3 + (seed % 6));
    const latency = Math.max(2, Math.round(baseLatency + jitter));
    const lossPct = Math.max(0, Math.min(4.5, ((seed % 23) / 50 + Math.sin(tick * 0.18 + seed) * 0.35)));
    const signalPct = Math.min(100, Math.max(38, 68 + (seed % 22) + Math.sin(tick * 0.12) * 6));
    const uptimePct = Math.min(99.98, 97.4 + (seed % 180) / 200 - lossPct * 0.08);
    let health = "healthy";
    let latencyClass = "text-emerald-400";
    let ringClass = "shadow-[0_0_0_1px_rgba(52,211,153,0.35)]";
    if (latency >= 35 || lossPct > 2.2) {
      health = "unstable";
      latencyClass = "text-rose-400";
      ringClass = "shadow-[0_0_0_1px_rgba(251,113,133,0.4)]";
    } else if (latency >= 18 || lossPct > 1) {
      health = "medium";
      latencyClass = "text-amber-400";
      ringClass = "shadow-[0_0_0_1px_rgba(251,191,36,0.38)]";
    }

    return { latency, lossPct, signalPct, uptimePct, health, latencyClass, ringClass };
  }, [baseLatency, seed, tick]);
}

const CATEGORY_STYLES = {
  SYNC: "border-cyan-400/35 bg-cyan-400/10 text-cyan-300",
  TLS: "border-sky-400/35 bg-sky-400/10 text-sky-300",
  NODE: "border-violet-400/35 bg-violet-400/10 text-violet-300",
  ALERT: "border-rose-400/40 bg-rose-400/12 text-rose-300",
  ROUTING: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  SECURITY: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
};

function categorizeType(type) {
  const t = String(type ?? "").toUpperCase();
  if (t.includes("TLS") || t.includes("HANDSHAKE")) return "TLS";
  if (t.includes("ROUT") || t.includes("RELAY")) return "ROUTING";
  if (t.includes("NODE") || t.includes("FTTH") || t.includes("EDGE")) return "NODE";
  if (t.includes("ALERT") || t.includes("PACKET") || t.includes("BURST") || t.includes("ISOLAT")) return "ALERT";
  if (t.includes("SEC") || t.includes("AUTH") || t.includes("ZERO")) return "SECURITY";
  if (t.includes("SYNC") || t.includes("ENCRYPT") || t.includes("VAULT")) return "SYNC";
  return "SYNC";
}

function severityTone(sev) {
  const s = String(sev ?? "info").toLowerCase();
  if (s === "critical" || s === "high") return "bg-rose-500/25 text-rose-200 ring-rose-500/30";
  if (s === "medium") return "bg-amber-500/20 text-amber-200 ring-amber-500/25";
  if (s === "low") return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
  return "bg-white/[0.06] text-slate-300 ring-white/10";
}

const NodeCard = memo(function NodeCard({ node }) {
  const { latency, lossPct, signalPct, uptimePct, health, latencyClass, ringClass } = useNodeTelemetry(
    node.id,
    node.latency,
  );

  return (
    <motion.div
      layout
      whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }}
      className={`rounded-[11px] border border-white/[0.07] bg-[#0f172a]/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[box-shadow,border-color] duration-300 hover:border-cyan-400/25 hover:shadow-[0_12px_36px_-18px_rgba(34,211,238,0.22)] ${ringClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{node.id}</p>
          <p className="truncate text-[11px] text-[#94a3b8]">
            {node.region} · {node.type}
          </p>
        </div>
        <span className="relative flex h-2 w-2 shrink-0 mt-1">
          {health !== "unstable" ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40 opacity-60" />
          ) : null}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              health === "healthy" ? "bg-emerald-400" : health === "medium" ? "bg-amber-400" : "bg-rose-400"
            }`}
          />
        </span>
      </div>
      <div className={`mt-2.5 font-mono text-xs tabular-nums ${latencyClass}`}>{latency} ms</div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-white/[0.06] pt-2 text-[10px] text-[#94a3b8]">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-[#64748b]">Loss</div>
          <div className="font-mono text-[#e2e8f0]">{lossPct.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-[#64748b]">Signal</div>
          <div className="font-mono text-[#e2e8f0]">{signalPct.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-[#64748b]">Uptime</div>
          <div className="font-mono text-[#e2e8f0]">{uptimePct.toFixed(2)}%</div>
        </div>
      </div>
    </motion.div>
  );
});

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const pk = Number(row.packets) || 0;
  const enc = Number(row.encrypted) || 0;
  const pktPerSec = pk / 60;
  const ratio = pk > 0 ? Math.min(100, Math.round((enc / pk) * 1000) / 10) : 0;
  return (
    <div className="rounded-lg border border-white/[0.12] bg-[#0c1220]/95 px-3 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#64748b]">Sample t={row.t}</div>
      <div className="space-y-1 font-mono text-[11px] text-[#e2e8f0]">
        <div className="flex justify-between gap-6">
          <span className="text-cyan-300/90">Packets/s</span>
          <span>{pktPerSec.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-emerald-300/90">Encrypted ratio</span>
          <span>{ratio}%</span>
        </div>
        <div className="flex justify-between gap-6 text-[#94a3b8]">
          <span>Raw window</span>
          <span>
            {pk} / {enc}
          </span>
        </div>
      </div>
    </div>
  );
}

function AnimatedMetric({ label, value, displayValue, icon: Icon, color, trendUp, trendPct, shimmer }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#111827] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      animate={shimmer ? { opacity: [1, 0.92, 1] } : {}}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {shimmer ? (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      ) : null}
      <Icon className={`relative mb-2 h-5 w-5 ${color}`} />
      <motion.p
        key={String(displayValue)}
        initial={{ opacity: 0.55, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className={`relative text-2xl font-bold tabular-nums ${color}`}
      >
        {displayValue ?? value}
      </motion.p>
      <p className="relative mt-0.5 text-xs text-[#9CA3AF]">{label}</p>
      <div className={`relative mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${trendUp ? "text-emerald-400/90" : "text-rose-400/90"}`}>
        {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {trendPct}
      </div>
    </motion.div>
  );
}

function normalizeIncomingEvent(raw, idx) {
  const ts = raw.timestamp ?? raw.createdAt ?? raw.at ?? new Date().toISOString();
  const type = raw.type ?? raw.eventType ?? "EVENT";
  const message = raw.message ?? raw.description ?? JSON.stringify(raw);
  const severity = raw.severity ?? "info";
  const id = String(raw.id ?? `${ts}-${idx}-${type}`);
  const category = categorizeType(type);
  return { id, timestamp: ts, type, message, severity, category };
}

export default function AdminTelemetryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [trafficHistory, setTrafficHistory] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      t: i,
      packets: Math.floor(Math.random() * 400 + 200),
      encrypted: Math.floor(Math.random() * 350 + 150),
    })),
  );
  const [liveEvents, setLiveEvents] = useState([]);
  const [connState, setConnState] = useState("RECONNECTING");
  const [regionFilter, setRegionFilter] = useState("all");
  const [relayQuery, setRelayQuery] = useState("");
  const timerRef = useRef(null);
  const prevPacketsRef = useRef(null);

  const [metricPulse, setMetricPulse] = useState(false);

  const packets = useOscillate(340, 120, 30);
  const encrypted = useOscillate(290, 90, 25);

  const fetchStats = useCallback(async () => {
    try {
      const res = await socApi.dashboardStats();
      setData(res);
      setError(null);
      setConnState((s) => (s === "OFFLINE" ? "CONNECTED" : s));
    } catch (e) {
      const norm = normalizeSocError(e);
      setError(norm.message);
      setConnState("OFFLINE");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
      setTrafficHistory((prev) => {
        const lastT = prev.length ? prev[prev.length - 1].t : 0;
        const next = [...prev.slice(-35), { t: lastT + 1, packets, encrypted }];
        return next;
      });
    }
  }, [packets, encrypted]);

  useEffect(() => {
    if (!lastRefresh) return undefined;
    setMetricPulse(true);
    const t = window.setTimeout(() => setMetricPulse(false), 520);
    return () => window.clearTimeout(t);
  }, [lastRefresh]);

  useEffect(() => {
    fetchStats();
    timerRef.current = window.setInterval(fetchStats, REFRESH_MS);
    return () => window.clearInterval(timerRef.current);
  }, [fetchStats]);

  useEffect(() => {
    const socket = connectTelemetrySocket();
    const onConnected = () => setConnState("CONNECTED");
    const onDisconnect = () => setConnState((s) => (s === "OFFLINE" ? s : "DEGRADED"));
    const onEvent = (payload) => {
      setLiveEvents((prev) => {
        const row = normalizeIncomingEvent(payload, prev.length);
        const next = [row, ...prev.filter((e) => e.id !== row.id)];
        return next.slice(0, EVENT_CAP);
      });
    };
    socket.on("telemetry:connected", onConnected);
    socket.on("telemetry:disconnect", onDisconnect);
    socket.on("telemetry:event", onEvent);
    return () => {
      socket.off("telemetry:connected", onConnected);
      socket.off("telemetry:disconnect", onDisconnect);
      socket.off("telemetry:event", onEvent);
    };
  }, []);

  const apiEvents = data?.recentEvents ?? data?.events ?? [];

  const mergedEvents = useMemo(() => {
    const fallback = [
      { timestamp: new Date().toISOString(), type: "RELAY_SYNC", message: "Relay synchronization complete — 6/6 nodes", severity: "info" },
      { timestamp: new Date(Date.now() - 5000).toISOString(), type: "TLS_HANDSHAKE", message: "TLS 1.3 handshake — FTTH-NODE-01", severity: "low" },
      { timestamp: new Date(Date.now() - 12000).toISOString(), type: "PACKET_BURST", message: "Packet burst detected — RELAY-04", severity: "medium" },
      { timestamp: new Date(Date.now() - 25000).toISOString(), type: "ENCRYPT_OK", message: "AES-256-GCM encryption verified — GW-WEST", severity: "info" },
    ];
    const base = apiEvents.length ? apiEvents : fallback;
    const mapped = base.map((ev, i) => normalizeIncomingEvent(ev, i));
    const byId = new Map();
    [...liveEvents, ...mapped].forEach((e) => {
      if (!byId.has(e.id)) byId.set(e.id, e);
    });
    return Array.from(byId.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, EVENT_CAP);
  }, [apiEvents, liveEvents]);

  const regions = useMemo(() => ["all", ...new Set(NODES.map((n) => n.region))], []);
  const filteredNodes = useMemo(() => {
    const q = relayQuery.trim().toLowerCase();
    return NODES.filter((n) => {
      if (regionFilter !== "all" && n.region !== regionFilter) return false;
      if (q && !n.id.toLowerCase().includes(q) && !n.region.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [regionFilter, relayQuery]);

  const trendPackets = useMemo(() => {
    const prev = prevPacketsRef.current;
    prevPacketsRef.current = packets;
    if (prev == null) return { up: true, label: "±0%" };
    const delta = ((packets - prev) / Math.max(prev, 1)) * 100;
    const up = delta >= 0;
    const mag = Math.min(12, Math.abs(Math.round(delta)));
    return { up, label: `${up ? "↑" : "↓"} ${mag || "<1"}%` };
  }, [packets]);

  const trendEnc = useMemo(() => {
    const encRatio = packets > 0 ? encrypted / packets : 0;
    const stable = Math.round(encRatio * 100);
    return { up: stable >= 82, label: `${stable >= 82 ? "↑" : "↓"} ${Math.min(8, Math.abs(85 - stable))}%` };
  }, [packets, encrypted]);

  const connUi = useMemo(() => {
    switch (connState) {
      case "CONNECTED":
        return {
          label: "CONNECTED",
          icon: Wifi,
          cls: "text-emerald-400",
          chip: "border-emerald-500/30 bg-emerald-500/10",
        };
      case "DEGRADED":
        return {
          label: "DEGRADED",
          icon: Wifi,
          cls: "text-amber-400",
          chip: "border-amber-500/30 bg-amber-500/10",
        };
      case "RECONNECTING":
        return {
          label: "RECONNECTING",
          icon: RefreshCw,
          cls: "text-sky-400",
          chip: "border-sky-500/30 bg-sky-500/10",
        };
      default:
        return {
          label: "OFFLINE",
          icon: WifiOff,
          cls: "text-rose-400",
          chip: "border-rose-500/30 bg-rose-500/10",
        };
    }
  }, [connState]);

  const ConnIcon = connUi.icon;

  return (
    <div className="admin-dark-scope min-h-full space-y-5 overflow-x-hidden p-4 sm:p-6 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Telemetry Control</h1>
          <p className="text-sm text-[#9CA3AF]">Live network topology · FTTH infrastructure monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <motion.div
            layout
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${connUi.chip}`}
          >
            <ConnIcon className={`h-3.5 w-3.5 ${connUi.cls} ${connState === "RECONNECTING" ? "animate-spin" : ""}`} />
            <span className={`font-semibold tracking-wide ${connUi.cls}`}>{connUi.label}</span>
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${connState === "CONNECTED" ? "animate-ping bg-emerald-400" : connState === "RECONNECTING" ? "animate-pulse bg-sky-400" : ""}`}
              />
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${connState === "CONNECTED" ? "bg-emerald-400" : "bg-current opacity-80"}`} />
            </span>
          </motion.div>
          {lastRefresh ? (
            <span className="text-[11px] text-[#6B7280] tabular-nums">
              Sync {lastRefresh.toLocaleTimeString()}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setConnState("RECONNECTING");
              void fetchStats();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#9CA3AF] transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AnimatedMetric
          label="Packets/min"
          value={packets}
          displayValue={packets}
          icon={Activity}
          color="text-cyan-400"
          trendUp={trendPackets.up}
          trendPct={trendPackets.label}
          shimmer={metricPulse}
        />
        <AnimatedMetric
          label="Encrypted aggregate"
          value={encrypted}
          displayValue={encrypted}
          icon={Shield}
          color="text-emerald-400"
          trendUp={trendEnc.up}
          trendPct={trendEnc.label}
          shimmer={metricPulse}
        />
        <AnimatedMetric
          label="Active relays"
          value={6}
          displayValue="6"
          icon={Radio}
          color="text-violet-400"
          trendUp
          trendPct="↑ 0%"
          shimmer={metricPulse}
        />
        <AnimatedMetric
          label="Edge latency (est.)"
          value="11ms"
          displayValue="11ms"
          icon={Zap}
          color="text-amber-400"
          trendUp={false}
          trendPct="↓ 2%"
          shimmer={metricPulse}
        />
      </div>

      {/* Traffic chart */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#111827] p-4 sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(148,163,184,0.25) 2px, rgba(148,163,184,0.25) 3px)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        <p className="relative mb-3 text-sm font-semibold text-[#9CA3AF]">Live traffic stream</p>
        <div className="relative h-44 sm:h-48 md:h-52 md:px-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trafficHistory} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="telPkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.22} />
                  <stop offset="92%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="telEncFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.14} />
                  <stop offset="92%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <filter id="telGlowSoft" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="1.05" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="5 10" stroke="#ffffff06" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<TrafficTooltip />} cursor={{ stroke: "rgba(148,163,184,0.12)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="packets"
                stroke="transparent"
                fill="url(#telPkFill)"
                strokeWidth={0}
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="encrypted"
                stroke="transparent"
                fill="url(#telEncFill)"
                strokeWidth={0}
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="packets"
                stroke="#22d3ee"
                strokeWidth={2}
                strokeOpacity={0.95}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#67e8f9", fillOpacity: 0.95 }}
                filter="url(#telGlowSoft)"
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="encrypted"
                stroke="#34d399"
                strokeWidth={2}
                strokeOpacity={0.92}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#6ee7b7", fillOpacity: 0.92 }}
                filter="url(#telGlowSoft)"
                isAnimationActive
                animationDuration={CHART_ANIM_MS}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="relative mt-2 flex flex-wrap gap-4 text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-sm bg-cyan-400/90" />
            Packets (aggregate window)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-sm bg-emerald-400/90" />
            Encrypted envelope
          </span>
        </div>
      </div>

      {/* Filters + Node grid */}
      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">Network nodes</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748b]" />
              <input
                value={relayQuery}
                onChange={(e) => setRelayQuery(e.target.value)}
                placeholder="Search node / region…"
                className="w-full min-w-[180px] rounded-lg border border-white/10 bg-[#0b1220] py-1.5 pl-8 pr-2 text-xs text-[#e5e7eb] outline-none focus:border-cyan-500/35 sm:w-56"
              />
            </div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0b1220] px-2 py-1.5 text-xs text-[#e5e7eb]"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "All regions" : r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {filteredNodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
        {filteredNodes.length === 0 ? (
          <p className="mt-3 text-center text-sm text-[#64748b]">No nodes match filters.</p>
        ) : null}
      </div>

      {/* Live event log */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111827] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#9CA3AF]">Telemetry event log</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              Live tail
            </span>
            <Wifi className="h-4 w-4 text-cyan-400/90" />
          </div>
        </div>
        <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 border-b border-white/[0.06] bg-[#111827]/95 pb-2 text-[10px] text-[#64748b] backdrop-blur-sm">
          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          Newest events surface first · polling + telemetry stream merge
        </div>
        <div className="max-h-[min(420px,52vh)] space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 font-mono text-[11px] sm:max-h-56 md:max-h-64">
          <AnimatePresence initial={false}>
            {mergedEvents.map((ev) => (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-white/[0.05] bg-[#0f172a]/80 px-2 py-1.5 sm:flex-nowrap"
              >
                <span className="shrink-0 text-[#64748b] tabular-nums">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "--:--:--"}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_STYLES[ev.category] ?? CATEGORY_STYLES.SYNC}`}
                >
                  {ev.category}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-px text-[10px] uppercase ring-1 ${severityTone(ev.severity)}`}>
                  {ev.severity}
                </span>
                <span className="min-w-0 flex-1 text-[#cbd5e1]">{ev.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
