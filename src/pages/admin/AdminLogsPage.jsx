import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Ban,
  Copy,
  Download,
  LocateFixed,
  Loader2,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import VirtualizedAuditTable from "@/features/siem/VirtualizedAuditTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useAuditCenterLogs } from "@/hooks/useAuditCenterLogs";
import { useGovernanceConsole } from "@/hooks/useGovernanceConsole";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { formatDisplayTimestamp } from "@/utils/auditLogSchema";
import { sanitizePlainText } from "@/utils/sanitize";
import { buildSocUiGates, normalizeSocRole } from "@/utils/socPermissions";

function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 500;
    const frames = 24;
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / frames, 1);
      setDisplay(Math.round(value * progress));
      if (progress >= 1) clearInterval(timer);
    }, duration / frames);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

function RiskGauge({ score }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.min(100, Math.max(0, Number(score) || 0));
  const offset = circumference - (safe / 100) * circumference;
  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="7" />
        <motion.circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#22D3EE"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#A5F3FC]">{safe}</div>
    </div>
  );
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const tableScrollRef = useRef(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerTab, setDrawerTab] = useState("Overview");
  const [toast, setToast] = useState("");
  const actorPrincipal = sanitizePlainText(user?.email ?? user?.fullName ?? "soc.analyst@lab", 254);
  const socPersona = normalizeSocRole(user?.socRole);
  const { governance } = useGovernanceConsole({ streamIntervalMs: 3400 });
  const uiGates = useMemo(() => buildSocUiGates(socPersona, governance), [socPersona, governance]);
  const auditGatesUi = useMemo(
    () => ({ canUiBlockIp: uiGates.canUiBlockIp, canInvestigateThreat: uiGates.canInvestigateThreat }),
    [uiGates.canUiBlockIp, uiGates.canInvestigateThreat],
  );

  const {
    catalog,
    filteredRows,
    fetchStatus,
    fetchError,
    reload,
    retry,
    query,
    setQuery,
    debouncedQuery,
    resultFilter,
    setResultFilter,
    actionFilter,
    setActionFilter,
    severityFilter,
    setSeverityFilter,
    dateRange,
    setDateRange,
    liveStream,
    setLiveStream,
    autoScroll,
    setAutoScroll,
    highlightedIds,
    criticalFlashIds,
    correlation,
    incidentIds,
    investigationQueue,
    analystTrail,
    blockIpForLog,
    markAsIncident,
    addToInvestigation,
    exportFilteredCsv,
    pollStreamOnce,
    isEmptyFiltered,
    isEmptyCatalog,
    burstTicker,
  } = useAuditCenterLogs({ streamPollMs: 3400, socRole: socPersona, actorPrincipal });

  useEffect(() => {
    if (!autoScroll || !liveStream) return;
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: smoothScrollSupported() ? "smooth" : "auto" });
  }, [burstTicker, autoScroll, liveStream]);

  const pushToast = (message) => {
    setToast(sanitizePlainText(message, 400));
    window.setTimeout(() => setToast(""), 2400);
  };

  const loginTrend = useMemo(() => {
    const buckets = new Map();
    catalog.forEach((log) => {
      const ts = Date.parse(log.timestamp);
      if (Number.isNaN(ts)) return;
      const d = new Date(ts);
      const label = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    });
    const pairs = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (!pairs.length) {
      return [
        { name: "08:00", value: 12 },
        { name: "10:00", value: 18 },
        { name: "12:00", value: 26 },
      ];
    }
    return pairs.map(([name, value]) => ({ name, value }));
  }, [catalog]);

  const suspiciousIps = useMemo(() => {
    const counts = new Map();
    catalog.forEach((log) => {
      if (!/blocked|denied/i.test(log.result)) return;
      counts.set(log.ip, (counts.get(log.ip) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ip, hits]) => ({ ip, hits }));
  }, [catalog]);

  const geoAttackSources = useMemo(() => {
    const counts = new Map();
    catalog.forEach((log) => {
      if (log.severity !== "Critical" && log.severity !== "High") return;
      counts.set(log.location, (counts.get(log.location) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([country, incidents]) => ({ country, incidents }));
  }, [catalog]);

  const resultDistribution = useMemo(() => {
    const success = catalog.filter((item) => item.result === "Success").length;
    const failed = catalog.filter((item) => item.result === "Failed").length;
    const blocked = catalog.filter((item) => item.result === "Blocked" || item.result === "Denied").length;
    return [
      { name: "Success", value: success, color: "#10B981" },
      { name: "Failed", value: failed, color: "#F59E0B" },
      { name: "Blocked / Denied", value: blocked, color: "#EF4444" },
    ];
  }, [catalog]);

  const metrics = useMemo(() => {
    const failed = catalog.filter((item) => item.result === "Failed").length;
    const blocked = catalog.filter((item) => item.result === "Blocked" || item.result === "Denied").length;
    const critical = catalog.filter((item) => item.severity === "Critical").length;
    return [
      {
        label: "Indexed Events",
        value: catalog.length,
        trend: "+12%",
        icon: ShieldCheck,
        color: "text-[#93C5FD]",
      },
      { label: "Failed Attempts", value: failed, trend: "+4%", icon: AlertTriangle, color: "text-[#FDE68A]" },
      { label: "Enforcement Blocks", value: blocked, trend: "+7%", icon: Ban, color: "text-[#FCA5A5]" },
      { label: "Critical Severity", value: critical, trend: "+2%", icon: ShieldAlert, color: "text-[#F97316]" },
    ];
  }, [catalog]);

  const clearFilters = () => {
    setQuery("");
    setResultFilter("All");
    setActionFilter("All");
    setSeverityFilter("All");
    setDateRange("Today");
  };

  const relatedSameIp = useMemo(() => {
    if (!selectedLog?.ip) return [];
    const ip = selectedLog.ip;
    return catalog.filter((r) => r.ip === ip && r.id !== selectedLog.id).slice(0, 14);
  }, [catalog, selectedLog]);

  const handleBlockIp = async (log) => {
    try {
      await blockIpForLog(log, actorPrincipal);
      pushToast(`IP blocked · policy ACK · trail: ${sanitizePlainText(actorPrincipal, 120)}`);
    } catch (err) {
      pushToast(normalizeSocError(err).message ?? "Sinkhole rejected for this principal.");
    }
  };

  const handleMarkIncident = async (log) => {
    try {
      await markAsIncident(log, actorPrincipal);
      pushToast(`Incident opened · attribution ${sanitizePlainText(actorPrincipal, 120)}`);
    } catch (err) {
      pushToast(normalizeSocError(err).message ?? "Incident ingest failed.");
    }
  };

  const handleInvestigate = async (log) => {
    try {
      await addToInvestigation(log, actorPrincipal);
      pushToast(`Queued for SOC hunt · owner ${sanitizePlainText(actorPrincipal, 120)}`);
    } catch (err) {
      pushToast(normalizeSocError(err).message ?? "Queue write failed.");
    }
  };

  const loading = fetchStatus === "loading";

  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-[520px] w-[520px] rounded-full bg-[#3B82F6]/12 blur-3xl"
        animate={{ x: [0, 16, -8, 0], y: [0, 10, -6, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-24 h-[420px] w-[420px] rounded-full bg-[#22D3EE]/10 blur-3xl"
        animate={{ x: [0, -14, 0], y: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">SIEM Audit Center</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Telecom northbound log fabric — streaming ingress, virtualized matrix, and compliance export.
          </p>
        </div>

        {fetchStatus === "error" ? (
          <ErrorBanner title="Audit pipeline fault" message={fetchError ?? ""} onRetry={() => void retry()} />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-[#3B82F6]/20 bg-white/[0.04] p-4 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.08)] transition hover:-translate-y-0.5 hover:border-[#3B82F6]/40 hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{metric.label}</span>
                  <span className="rounded-xl border border-white/10 bg-[#0B1220]/70 p-2">
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {loading ? "—" : <AnimatedCount value={metric.value} />}
                </div>
                <div className="mt-1 text-xs text-[#6EE7B7]">{metric.trend} from previous cycle</div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Event Volume by Hour (indexed)</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loginTrend}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Disposition Mix</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resultDistribution} dataKey="value" innerRadius={50} outerRadius={82} paddingAngle={3}>
                    {resultDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-1 text-sm font-semibold text-[#E5E7EB]">Top Blocked / Denied Sources</div>
            <div className="mb-3 text-xs text-[#64748B]">Auto-derived from current SIEM buffer</div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={suspiciousIps.length ? suspiciousIps : [{ ip: "—", hits: 0 }]} barCategoryGap={14}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="ip" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}
                  />
                  <defs>
                    <linearGradient id="suspiciousBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="hits" radius={[6, 6, 0, 0]} fill="url(#suspiciousBarGradient)" maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-1 text-sm font-semibold text-[#E5E7EB]">High / Critical Geographies</div>
            <div className="mb-3 text-xs text-[#64748B]">Correlated to severity labels in-buffer</div>
            <div className="h-[220px] space-y-2 overflow-y-auto pr-1">
              {(geoAttackSources.length ? geoAttackSources : [{ country: "No high-severity in view", incidents: 0 }]).map(
                (item) => (
                  <div key={item.country} className="rounded-lg border border-white/10 bg-[#0F172A]/75 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-[#D1D5DB]">{sanitizePlainText(item.country, 120)}</span>
                      <span className="text-xs text-[#93C5FD]">{item.incidents} hits</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.incidents / 12) * 100)}%` }}
                        transition={{ duration: 0.35 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#2563EB]"
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(sanitizePlainText(e.target.value, 240));
                }}
                placeholder="User / email / IP / action / location"
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#3B82F6]/60"
              />
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>All</option>
                <option>Success</option>
                <option>Failed</option>
                <option>Blocked</option>
                <option>Denied</option>
              </select>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>All</option>
                <option>Login</option>
                <option>Upload</option>
                <option>Export</option>
                <option>Delete</option>
                <option>API Probe</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>Today</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <div className="flex flex-wrap items-center gap-2">
                {query !== debouncedQuery ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-2 py-1 text-[#BFDBFE]">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Debouncing search…
                  </span>
                ) : null}
                <span>
                  Filtered: <strong className="text-[#E5E7EB]">{filteredRows.length}</strong> / {catalog.length} in buffer
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={liveStream}
                    onChange={(e) => setLiveStream(e.target.checked)}
                    className="rounded border-white/20 bg-[#0B1220]"
                  />
                  <Radio className="h-4 w-4 text-[#38BDF8]" aria-hidden />
                  Live stream
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    disabled={!liveStream}
                    className="rounded border-white/20 bg-[#0B1220] disabled:opacity-40"
                  />
                  Auto-scroll new
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void reload();
                    pushToast("Full catalogue resynced");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB] transition hover:border-[#3B82F6]/35"
                >
                  <RefreshCw className="h-4 w-4" /> Resync GET /logs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void pollStreamOnce();
                    pushToast("Pulled /logs/stream packet");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-sm text-[#A5F3FC] transition hover:bg-[#38BDF8]/20"
                >
                  Stream poll
                </button>
                <button
                  type="button"
                  disabled={!uiGates.canUiExportLogs}
                  title={!uiGates.canUiExportLogs ? "Export denied — adjust Access Roles in SCC or elevate persona." : undefined}
                  onClick={() => {
                    if (!uiGates.canUiExportLogs) {
                      pushToast("Export denied for this SOC persona / governance matrix.");
                      return;
                    }
                    void exportFilteredCsv().then(() => pushToast("Export committed (northbound ACK)"));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" /> Export filtered CSV
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#FCA5A5] transition hover:bg-[#EF4444]/20"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95">
          {loading && isEmptyCatalog ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-[#94A3B8]">
              <Loader2 className="h-10 w-10 animate-spin text-[#38BDF8]" aria-hidden />
              <p className="text-sm">Hydrating SIEM corpus from GET /logs…</p>
            </div>
          ) : isEmptyCatalog ? (
            <div className="p-6">
              <EmptyState title="No audit events indexed" description="Northbound collector returned an empty buffer." />
            </div>
          ) : isEmptyFiltered ? (
            <div className="p-8 text-center text-sm text-[#94A3B8]">No rows match active SIEM facets — widen timeframe or facets.</div>
          ) : (
            <>
              {correlation.suspiciousPatternDetected ? (
                <div
                  role="alert"
                  className="mx-4 mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-[#F97316]/40 bg-[#F97316]/12 px-4 py-3 text-sm text-[#FDBA74]"
                >
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#FB923C]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#FFEDD5]">Suspicious pattern detected</div>
                    <p className="mt-1 text-xs leading-relaxed text-[#FED7AA]">
                      {correlation.flaggedIpCount} source IP
                      {correlation.flaggedIpCount === 1 ? "" : "s"} exceeded negative-outcome thresholds in the buffered
                      fabric (credential abuse / brute-force heuristic). Streams and highlights respect your active funnel;
                      widen filters if you expect cross-region noise.
                    </p>
                    <div className="mt-2 font-mono text-[11px] text-[#FECACA]/90">
                      {correlation.flaggedIps.slice(0, 6).map((ip) => sanitizePlainText(ip, 45)).join(" · ") || "—"}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="border-b border-white/5 px-4 py-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Playbook audit trail · POST /logs/action
                </div>
                {analystTrail.length === 0 ? (
                  <p className="text-xs text-[#64748B]">No SOC actions logged this session.</p>
                ) : (
                  <ul className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {analystTrail.slice(0, 10).map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-white/5 bg-[#0F172A]/80 px-2 py-1.5 font-mono text-[11px] text-[#CBD5E1]"
                      >
                        <span className="text-[#93C5FD]">{sanitizePlainText(entry.actor, 254)}</span>
                        <span className="text-[#64748B]">{formatDisplayTimestamp(entry.at)}</span>
                        <span className="text-[#E5E7EB]">{sanitizePlainText(entry.kind ?? entry.type ?? "", 32)}</span>
                        <span className="text-[#94A3B8] truncate max-w-[200px]" title={sanitizePlainText(entry.detail, 400)}>
                          {sanitizePlainText(entry.detail, 180)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <VirtualizedAuditTable
                scrollParentRef={tableScrollRef}
                rows={filteredRows}
                highlightedIds={highlightedIds}
                criticalFlashIds={criticalFlashIds}
                selectedId={selectedLog?.id}
                correlationById={correlation.byId}
                incidentIds={incidentIds}
                investigationQueue={investigationQueue}
                onRowSelect={(row) => {
                  setSelectedLog(row);
                  setDrawerTab("Overview");
                }}
                onCopyIp={(ip) => {
                  void navigator.clipboard.writeText(sanitizePlainText(ip, 64));
                  pushToast("IP copied (sanitized buffer)");
                }}
                onBlockIp={handleBlockIp}
                onMarkIncident={handleMarkIncident}
                onInvestigate={handleInvestigate}
                auditGates={auditGatesUi}
                liveStream={liveStream}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0F172A] px-4 py-3 text-xs text-[#64748b]">
                <span>
                  Virtualized viewport · Priority queue sorts Critical-first ·{" "}
                  <strong className="text-[#CBD5F5]">{filteredRows.length}</strong> filtered rows · buffer{" "}
                  <strong className="text-[#CBD5F5]">{catalog.length}</strong>
                </span>
                <span>GET /logs · GET /logs/stream · POST /logs/filter · POST /logs/action</span>
              </div>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedLog ? (
          <>
            <motion.button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close detail"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[430px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.16)]"
            >
              <div className="border-b border-white/10 px-5 py-4">
                <div className="mb-1 text-sm font-semibold text-white">Audit Event Details</div>
                <div className="text-xs text-[#94A3B8]">
                  Session {sanitizePlainText(selectedLog.meta?.sessionId ?? "—", 96)}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-[#111827]/65 p-1 text-xs">
                  {["Overview", "Threat Intel", "History", "Actions"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDrawerTab(tab)}
                      className={`rounded-md px-2 py-1.5 transition ${
                        drawerTab === tab
                          ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                          : "text-[#9CA3AF] hover:bg-white/5 hover:text-[#BFDBFE]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
                <AnimatePresence mode="wait">
                  {drawerTab === "Overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-[#D1D5DB]">
                        <div>
                          Timestamp:{" "}
                          <span className="text-[#BFDBFE]">{formatDisplayTimestamp(selectedLog.timestamp)}</span>
                        </div>
                        <div>
                          Event: <span className="text-[#BFDBFE]">{sanitizePlainText(selectedLog.action, 80)}</span>
                        </div>
                        <div>
                          User: {sanitizePlainText(selectedLog.user, 160)} ({sanitizePlainText(selectedLog.email, 254)})
                        </div>
                        <div>
                          Result:{" "}
                          <span
                            className={
                              selectedLog.result === "Success" ? "text-[#6EE7B7]" : "text-[#FCA5A5]"
                            }
                          >
                            {sanitizePlainText(selectedLog.result, 32)}
                          </span>
                        </div>
                        <div>Severity: {sanitizePlainText(selectedLog.severity, 24)}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-[#D1D5DB]">
                        <div className="inline-flex items-center gap-1">
                          <LocateFixed className="h-4 w-4 text-[#93C5FD]" /> Geo:
                          <span className="ml-1 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-xs text-[#BFDBFE]">
                            {sanitizePlainText(selectedLog.location, 120)}
                          </span>
                        </div>
                        <div>IP: {sanitizePlainText(selectedLog.ip, 45)}</div>
                        <div>Device: {sanitizePlainText(selectedLog.device, 120)}</div>
                      </div>
                    </motion.div>
                  )}

                  {drawerTab === "Threat Intel" && (
                    <motion.div
                      key="intel"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                        <div className="mb-2 text-xs uppercase tracking-wide text-[#94A3B8]">Operator risk index</div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-[#D1D5DB]">Derived from severity + disposition (simulated SIEM score)</div>
                          <RiskGauge score={selectedLog.meta?.risk ?? 50} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-xs text-[#9CA3AF]">
                        <div>- ASN reputation cross-check (mock)</div>
                        <div>- Device posture vs. corporate MDM profile</div>
                      </div>
                    </motion.div>
                  )}

                  {drawerTab === "History" && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2"
                    >
                      <div className="mb-1 text-xs uppercase tracking-wide text-[#94A3B8]">Correlated — same IP in buffer</div>
                      {relatedSameIp.length === 0 ? (
                        <p className="text-xs text-[#64748B]">No sibling events for this source in the indexed window.</p>
                      ) : (
                        relatedSameIp.map((rel) => (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => setSelectedLog(rel)}
                            className="w-full rounded-lg border border-white/10 bg-[#111827]/70 p-2.5 text-left text-xs text-[#D1D5DB] transition hover:border-[#3B82F6]/35"
                          >
                            <div className="font-mono text-[#BFDBFE]">{sanitizePlainText(rel.action ?? "", 80)}</div>
                            <div className="mt-0.5 text-[#64748B]">
                              {formatDisplayTimestamp(rel.timestamp)} ·{" "}
                              <span className="text-[#94A3B8]">{sanitizePlainText(rel.result ?? "", 32)}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}

                  {drawerTab === "Actions" && (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2"
                    >
                      <p className="text-[11px] text-[#64748B]">
                        Actions simulate POST /security/block-ip plus POST /logs/action for telecom-grade attribution (
                        {sanitizePlainText(actorPrincipal, 120)}).
                      </p>
                      <button
                        type="button"
                        disabled={!uiGates.canUiBlockIp}
                        onClick={() => void handleBlockIp(selectedLog)}
                        className="w-full rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 px-3 py-2 text-sm text-[#FCA5A5] transition hover:bg-[#EF4444]/20 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Block IP
                      </button>
                      <button
                        type="button"
                        disabled={!uiGates.canInvestigateThreat}
                        onClick={() => void handleMarkIncident(selectedLog)}
                        className="w-full rounded-lg border border-[#F97316]/30 bg-[#F97316]/15 px-3 py-2 text-sm text-[#FDBA74] transition hover:bg-[#F97316]/20 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Mark as incident
                      </button>
                      <button
                        type="button"
                        disabled={!uiGates.canInvestigateThreat}
                        onClick={() => void handleInvestigate(selectedLog)}
                        className="w-full rounded-lg border border-[#38BDF8]/35 bg-[#38BDF8]/12 px-3 py-2 text-sm text-[#BAE6FD] transition hover:bg-[#38BDF8]/20 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Add to investigation queue
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  disabled={!uiGates.canUiBlockIp}
                  onClick={() => void handleBlockIp(selectedLog)}
                  className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 px-2 py-2 text-xs text-[#FCA5A5] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Block IP
                </button>
                <button
                  type="button"
                  disabled={!uiGates.canInvestigateThreat}
                  onClick={() => void handleMarkIncident(selectedLog)}
                  className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-2 py-2 text-xs text-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Mark incident
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          id: selectedLog.id,
                          timestamp: selectedLog.timestamp,
                          user: selectedLog.user,
                          email: selectedLog.email,
                          ip: selectedLog.ip,
                          location: selectedLog.location,
                          device: selectedLog.device,
                          action: selectedLog.action,
                          severity: selectedLog.severity,
                          result: selectedLog.result,
                        },
                        null,
                        2,
                      ),
                    );
                    pushToast("Structured event JSON copied");
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-xs text-[#D1D5DB]"
                >
                  <span className="inline-flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy JSON
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => pushToast("IOC enrichment requested")}
                  className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-2 py-2 text-xs text-[#A7F3D0]"
                >
                  Enrich IOC
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(59,130,246,0.24)]"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function smoothScrollSupported() {
  try {
    return "scrollBehavior" in document.documentElement.style;
  } catch {
    return false;
  }
}
