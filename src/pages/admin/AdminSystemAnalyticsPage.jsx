import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Cpu,
  Database,
  Layers,
  Loader2,
  Network,
  RefreshCw,
  Shield,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { socApi } from "@/services/apiClient";
import { useSocAnalyticsDashboard } from "@/hooks/useSocAnalyticsDashboard";
import { sanitizePlainText } from "@/utils/sanitize";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid rgba(56,189,248,0.25)",
    borderRadius: 10,
    fontSize: 11,
  },
};

const THREAT_COLORS = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#10B981",
  trusted: "#34D399",
  suspicious: "#FB923C",
  review: "#FBBF24",
};

function formatDateShort(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatBytes(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x) || x <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = x;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function DeltaArrow({ pct, invertBad }) {
  const n = Number(pct ?? 0);
  if (!Number.isFinite(n) || n === 0) return <span className="text-[10px] text-[#64748B]">flat</span>;
  const up = n > 0;
  const bad = invertBad ? up : !up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${bad ? "text-rose-400" : "text-emerald-400"}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(Math.round(n))}%
    </span>
  );
}

const UploadActivityMemo = memo(function UploadActivityMemo({ data }) {
  const rows = (data ?? []).map((d) => ({ date: formatDateShort(d.date), uploads: d.count }));
  const has = rows.some((r) => r.uploads > 0);
  if (!has && rows.length) {
    return <p className="py-12 text-center text-sm text-[#64748B]">No uploads in rolling 30d window.</p>;
  }
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: -12, right: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748B" }} interval={4} />
          <YAxis tick={{ fontSize: 9, fill: "#64748B" }} allowDecimals={false} width={32} />
          <Tooltip {...CHART_TOOLTIP} />
          <Bar dataKey="uploads" fill="#818cf8" radius={[4, 4, 0, 0]} name="Uploads" animationDuration={520} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

const RegistrationMemo = memo(function RegistrationMemo({ merged }) {
  const rows = merged ?? [];
  const has = rows.some((r) => r.registrations > 0 || r.authStress > 0);
  if (!has && rows.length)
    return <p className="py-12 text-center text-sm text-[#64748B]">No registration telemetry in window.</p>;
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -12, right: 8 }}>
          <defs>
            <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="92%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="8%" stopColor="#fb7185" stopOpacity={0.28} />
              <stop offset="90%" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748B" }} interval={4} />
          <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748B" }} allowDecimals={false} width={28} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748B" }} allowDecimals={false} width={28} />
          <Tooltip {...CHART_TOOLTIP} />
          <Area yAxisId="left" type="monotone" dataKey="registrations" stroke="#22d3ee" fill="url(#regGrad)" strokeWidth={2} name="Registrations" />
          <Line yAxisId="right" type="monotone" dataKey="authStress" stroke="#fb7185" strokeWidth={2} dot={false} name="Auth stress" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const SecurityDualMemo = memo(function SecurityDualMemo({ series }) {
  const rows = (series ?? []).map((r) => ({
    date: formatDateShort(r.date),
    security: r.security,
    threats: r.threats,
    malwareHits: r.malwareHits,
  }));
  const has = rows.some((r) => r.security || r.threats || r.malwareHits);
  if (!has && rows.length)
    return <p className="py-12 text-center text-sm text-[#64748B]">No SIEM-class bursts in window.</p>;
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ left: -12, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748B" }} interval={4} />
          <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748B" }} allowDecimals={false} width={28} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748B" }} allowDecimals={false} width={28} />
          <Tooltip {...CHART_TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="security" fill="#f43f5e99" radius={[3, 3, 0, 0]} name="Security events" />
          <Line yAxisId="right" type="monotone" dataKey="threats" stroke="#fbbf24" strokeWidth={2} dot={false} name="Threat analyses" />
          <Line yAxisId="right" type="monotone" dataKey="malwareHits" stroke="#a78bfa" strokeWidth={1.6} dot={false} name="Malware scans" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

const TrendSpark = memo(function TrendSpark({ title, data, dataKey, stroke }) {
  const rows = data ?? [];
  const gid = `spark-${String(title).replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{title}</p>
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="8%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="92%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip {...CHART_TOOLTIP} />
            <Area type="monotone" dataKey={dataKey} stroke={stroke} fill={`url(#${gid})`} strokeWidth={1.5} isAnimationActive animationDuration={420} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default function AdminSystemAnalyticsPage() {
  const {
    overview,
    usersBoard,
    threats,
    uploads,
    system,
    telemetry,
    ai,
    feed,
    trends,
    regAuth,
    securitySeries,
    fileTypes,
    status,
    error,
    reload,
  } = useSocAnalyticsDashboard({ pollMs: 62000 });

  const [sort, setSort] = useState({ key: "uploads", dir: "desc" });
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [drawerData, setDrawerUserData] = useState(null);
  const [drawerBusy, setDrawerBusy] = useState(false);

  const k = overview?.kpis ?? {};
  const loading = status === "loading" && !overview;

  const mergedRegistration = useMemo(() => {
    const reg = regAuth?.registrationsPerDay ?? [];
    const auth = regAuth?.authAnomaliesPerDay ?? [];
    const keys = new Set([...reg.map((x) => x.date), ...auth.map((x) => x.date)]);
    return [...keys]
      .sort()
      .map((date) => ({
        date: formatDateShort(date),
        registrations: reg.find((x) => x.date === date)?.count ?? 0,
        authStress: auth.find((x) => x.date === date)?.count ?? 0,
      }));
  }, [regAuth]);

  const threatPie = useMemo(() => {
    const rows = threats?.threatLevelDistribution ?? [];
    return rows.map((d) => ({
      ...d,
      color: THREAT_COLORS[String(d.level).toUpperCase()] ?? "#64748B",
    }));
  }, [threats]);

  const sortedUsers = useMemo(() => {
    const list = [...(usersBoard?.users ?? [])];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
    return list;
  }, [usersBoard?.users, sort.key, sort.dir]);

  const toggleSort = useCallback((key) => {
    setSort((s) => (s.key !== key ? { key, dir: "desc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" }));
  }, []);

  useEffect(() => {
    if (!drawerUserId) {
      setDrawerUserData(null);
      return undefined;
    }
    let cancelled = false;
    setDrawerBusy(true);
    void socApi
      .analyticsUser(drawerUserId)
      .then((data) => {
        if (!cancelled) setDrawerUserData(data);
      })
      .catch(() => {
        if (!cancelled) setDrawerUserData(null);
      })
      .finally(() => {
        if (!cancelled) setDrawerBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drawerUserId]);

  const kpisTop = [
    {
      label: "Upload volume",
      value: formatBytes(k.totalUploadVolumeBytes),
      sub: `${k.totalFilesIndexed ?? 0} objects`,
      icon: Layers,
      accent: "border-cyan-500/25 text-cyan-300",
      delta: k.deltas?.uploadsPct,
      invertDelta: false,
    },
    {
      label: "Active threats",
      value: k.activeThreats ?? "—",
      sub: "HIGH/CRITICAL/quarantine",
      icon: Shield,
      accent: "border-rose-500/25 text-rose-300",
      delta: k.deltas?.threatsPct,
      invertDelta: true,
    },
    {
      label: "Detection rate",
      value: `${k.detectionRatePct ?? 0}%`,
      sub: "threat runs / uploads · 24h",
      icon: AlertTriangle,
      accent: "border-amber-500/25 text-amber-200",
      delta: k.deltas?.threatsPct,
      invertDelta: true,
    },
    {
      label: "Avg scan latency",
      value: k.avgScanLatencyMs != null ? `${k.avgScanLatencyMs}ms` : "—",
      sub: "uploadDurationMs avg",
      icon: Zap,
      accent: "border-violet-500/25 text-violet-200",
      delta: null,
      invertDelta: false,
    },
    {
      label: "API throughput",
      value: `${k.apiThroughputPerMin ?? 0}/min`,
      sub: k.rollingWindowLabel ?? "",
      icon: Activity,
      accent: "border-emerald-500/25 text-emerald-200",
      delta: k.deltas?.securityEventsPct,
      invertDelta: false,
    },
    {
      label: "Realtime sessions",
      value: k.realtimeConnections ?? "—",
      sub: "last 15m activity",
      icon: Network,
      accent: "border-sky-500/25 text-sky-200",
      delta: null,
      invertDelta: false,
    },
    {
      label: "AI correlation",
      value: `${k.aiCorrelationRatePct ?? 0}%`,
      sub: "suspicious / analyses · 72h",
      icon: Brain,
      accent: "border-fuchsia-500/25 text-fuchsia-200",
      delta: null,
      invertDelta: true,
    },
    {
      label: "Relay health",
      value: `${k.relayHealthPct ?? 0}%`,
      sub: `SOAR touches ${k.soarResponses60m ?? 0}/60m`,
      icon: Cpu,
      accent: "border-teal-500/25 text-teal-200",
      delta: null,
      invertDelta: true,
    },
  ];

  const sortIndicator = (key) => (sort.key === key ? (sort.dir === "asc" ? "↑" : "↓") : "");

  return (
    <div className="min-h-full space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">System Analytics</h1>
          <p className="text-xs text-[#94A3B8] md:text-sm">
            SOC observability · forensic aggregates · websocket batched refresh ·{" "}
            <span className="text-[#64748B]">{sanitizePlainText(overview?.correlationHint ?? "", 420)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-[#E5E7EB] transition hover:border-cyan-500/30 hover:bg-white/[0.08] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {status === "error" ? <ErrorBanner title="Analytics fault" message={error ?? ""} onRetry={() => void reload()} /> : null}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpisTop.map((card) => (
          <motion.div
            key={card.label}
            layout
            className={`rounded-xl border bg-[#111827]/95 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition hover:border-cyan-500/20 ${card.accent}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{card.label}</span>
              <card.icon className="h-4 w-4 opacity-70" aria-hidden />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-white">{loading ? "—" : card.value}</p>
            <p className="mt-0.5 text-[10px] text-[#64748B]">{card.sub}</p>
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-[10px] text-[#64748B]">Δ footprint</span>
              {card.delta != null ? <DeltaArrow pct={card.delta} invertBad={card.invertDelta} /> : <span className="text-[10px] text-[#64748B]">—</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0f172a]/80 px-3 py-2 text-[11px] text-[#94A3B8]">
        Fleet posture{" "}
        <span className="font-semibold text-[#FDE68A]">{sanitizePlainText(k.healthState ?? "—", 24)}</span>
        {" · "}
        Cross-plane ingest merges uploads, telemetry, AI ThreatAnalysis, SecurityEvent, SOAR-tagged ActivityEvent (same websocket plane as SIEM dashboards).
      </div>

      {/* Uploads + registration */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Upload throughput · 30d</p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden /> : null}
          </div>
          <UploadActivityMemo data={uploads?.uploadsPerDay} />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-2 flex flex-wrap justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Registrations vs auth stress</p>
            <span className="text-[10px] text-[#64748B]">
              Suspicious statuses {regAuth?.suspiciousSignupWindow ?? 0} · blocked {regAuth?.blockedRegistrationsWindow ?? 0}
            </span>
          </div>
          <RegistrationMemo merged={mergedRegistration} />
        </div>
      </div>

      {/* Security dual */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Security · threats · malware telemetry</p>
          <BarChart3 className="h-4 w-4 text-[#64748B]" aria-hidden />
        </div>
        <SecurityDualMemo series={securitySeries?.series} />
      </div>

      {/* File types + threat donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">File-type forensic density</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fileTypes?.distribution ?? []} layout="vertical" margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748B" }} />
                <YAxis type="category" dataKey="type" width={56} tick={{ fontSize: 9, fill: "#94A3B8" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, _name, ctx) => [
                    `${value} files · ${ctx.payload.volumePct}% vol · anomalies ${ctx.payload.anomalyDensity} · entropy ${ctx.payload.avgEntropy}`,
                    ctx.payload.type,
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1cc" radius={[0, 6, 6, 0]} animationDuration={520} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Threat severity · lifecycle hooks</p>
            <span className="text-[10px] text-[#64748B]">
              Q {threats?.quarantinedCount ?? 0} · mitigated≈{threats?.mitigatedApprox ?? 0} · investigations {threats?.investigationsTouch ?? 0}
            </span>
          </div>
          {threatPie.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#64748B]">No threat-labelled files yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={threatPie}
                      dataKey="count"
                      nameKey="level"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="#0f172a"
                      strokeWidth={1}
                      animationDuration={620}
                    >
                      {threatPie.map((e) => (
                        <Cell key={e.level} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="max-h-52 flex-1 space-y-1.5 overflow-y-auto text-[11px]">
                {threatPie.map((d) => (
                  <li key={d.level} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1">
                    <span className="flex items-center gap-2 capitalize text-[#CBD5E1]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {sanitizePlainText(d.level, 32)}
                    </span>
                    <span className="font-mono text-[#FDE68A]">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Trends + infra + AI */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Forensic trend lattice · 14d</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TrendSpark title="Upload growth" data={trends?.uploadGrowth} dataKey="count" stroke="#38bdf8" />
            <TrendSpark title="Threat analyses" data={trends?.threatGrowth} dataKey="count" stroke="#fb7185" />
            <TrendSpark title="Quarantine" data={trends?.quarantineFreq} dataKey="count" stroke="#fbbf24" />
            <TrendSpark title="Auth pressure" data={trends?.authPressure} dataKey="count" stroke="#a78bfa" />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Infrastructure pulse</p>
          <ul className="space-y-2 text-[11px] text-[#CBD5E1]">
            <li className="flex justify-between border-b border-white/5 pb-1">
              <span className="flex items-center gap-1 text-[#94A3AF]">
                <Database className="h-3 w-3" aria-hidden /> DB RTT
              </span>
              <span className="font-mono text-cyan-300">{system?.dbLatencyMs ?? "—"}ms</span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-[#94A3AF]">Heap</span>
              <span className="font-mono">
                {system?.memoryHeapUsedMb}/{system?.memoryHeapTotalMb} MiB
              </span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-[#94A3AF]">Storage indexed</span>
              <span className="font-mono text-right">{formatBytes(system?.storageBytes)}</span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-[#94A3AF]">WS proxy throughput</span>
              <span className="font-mono">{system?.websocketThroughputProxyPerMin ?? 0}/min</span>
            </li>
            <li className="flex justify-between">
              <span className="text-[#94A3AF]">Process uptime</span>
              <span className="font-mono">{Math.floor((system?.nodeUptimeSec ?? 0) / 3600)}h</span>
            </li>
          </ul>
          <p className="mt-3 text-[10px] uppercase tracking-wide text-[#64748B]">Telemetry stages · 24h</p>
          <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto font-mono text-[10px] text-[#93C5FD]">
            {(telemetry?.stages24h ?? []).map((s) => (
              <li key={s.stage} className="flex justify-between">
                <span className="truncate">{sanitizePlainText(s.stage, 48)}</span>
                <span>{s.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-[#64748B]">Avg telemetry latency {telemetry?.avgLatencyMs ?? "—"}ms</p>
        </div>
      </div>

      {/* AI strip */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#CBD5E1]">
          <span className="flex items-center gap-1 font-semibold text-[#94A3AF]">
            <Brain className="h-4 w-4 text-violet-400" aria-hidden /> AI correlation desk
          </span>
          <span>
            Runs 72h: <span className="font-mono text-violet-200">{ai?.modelDetections72h ?? 0}</span>
          </span>
          <span>
            Suspicious share: <span className="font-mono text-amber-200">{ai?.suspiciousSharePct ?? 0}%</span>
          </span>
          <span>
            Avg anomaly: <span className="font-mono text-cyan-200">{ai?.avgConfidenceProxy ?? 0}</span>
          </span>
          <span className="text-[10px] text-[#64748B]">
            {(ai?.classificationMix ?? [])
              .slice(0, 4)
              .map((c) => `${sanitizePlainText(c.label, 20)}:${c.count}`)
              .join(" · ") || "No classification mass"}
          </span>
        </div>
      </div>

      {/* Live feed */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Realtime analytics stream</p>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {(feed?.items ?? []).map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] hover:border-cyan-500/25"
              >
                <span className="font-mono text-[10px] text-[#64748B]">{new Date(item.at).toLocaleTimeString()}</span>
                <span className="rounded bg-white/[0.06] px-1.5 font-semibold uppercase tracking-wide text-[#93C5FD]">
                  {sanitizePlainText(item.kind, 40)}
                </span>
                <span className="min-w-0 flex-1 text-[#E5E7EB]">{sanitizePlainText(item.message, 480)}</span>
                <span className="text-[10px] text-[#94A3AF]">{sanitizePlainText(item.severity, 16)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!feed?.items?.length && !loading ? (
            <p className="py-8 text-center text-sm text-[#64748B]">Feed idle — awaiting cross-plane signals.</p>
          ) : null}
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3AF]">Operator leaderboard · forensic posture</p>
          <TrendingUp className="h-4 w-4 text-[#64748B]" aria-hidden />
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur">
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-[#64748B]">
                <th className="px-3 py-2">User</th>
                {[
                  ["uploads", "Uploads"],
                  ["detectionsTriggered", "Detections"],
                  ["anomalyScore", "Anomaly"],
                  ["trustScore", "Trust"],
                  ["riskLevel", "Risk"],
                  ["activeSessions", "Sessions"],
                  ["lastActivity", "Last seen"],
                  ["role", "Role"],
                ].map(([key, lab]) => (
                  <th key={key} className="px-3 py-2">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-cyan-300" onClick={() => toggleSort(key)}>
                      {lab}
                      <span className="font-mono text-[9px]">{sortIndicator(key)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !sortedUsers.length ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#64748B]">
                    Loading operators…
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-3 py-2">
                      <button type="button" className="text-left" onClick={() => setDrawerUserId(u.id)}>
                        <span className="font-medium text-[#E5E7EB]">{sanitizePlainText(u.fullName, 120)}</span>
                        <span className="block font-mono text-[10px] text-[#64748B]">{sanitizePlainText(u.email, 200)}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono text-[#CBD5E1]">{u.uploads}</td>
                    <td className="px-3 py-2 font-mono text-amber-200">{u.detectionsTriggered}</td>
                    <td className="px-3 py-2 font-mono">{u.anomalyScore}</td>
                    <td className="px-3 py-2 font-mono text-emerald-300">{u.trustScore}</td>
                    <td className="px-3 py-2 capitalize text-[#FCA5A5]">{sanitizePlainText(u.riskLevel, 24)}</td>
                    <td className="px-3 py-2 font-mono">{u.activeSessions}</td>
                    <td className="px-3 py-2 text-[#94A3AF]">{u.lastActivity ? new Date(u.lastActivity).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] capitalize">{sanitizePlainText(u.role, 24)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerUserId ? (
          <>
            <motion.button
              type="button"
              aria-label="Close drawer"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerUserId(null)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-lg flex-col border-l border-cyan-500/25 bg-[#0f172a] shadow-[-12px_0_36px_rgba(34,211,238,0.12)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Forensic operator trace</p>
                  <p className="font-mono text-[11px] text-[#64748B]">{sanitizePlainText(drawerUserId, 120)}</p>
                </div>
                <button type="button" className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white" onClick={() => setDrawerUserId(null)}>
                  Close
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 text-xs text-[#CBD5E1]">
                {drawerBusy ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" aria-hidden />
                  </div>
                ) : drawerData?.user ? (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="font-semibold text-white">{sanitizePlainText(drawerData.user.fullName, 160)}</p>
                      <p className="font-mono text-[11px] text-[#94A3AF]">{sanitizePlainText(drawerData.user.email, 200)}</p>
                      <p className="mt-2 text-[11px] text-[#94A3AF]">
                        Role {sanitizePlainText(drawerData.user.role, 32)} · status {sanitizePlainText(drawerData.user.status, 24)}
                      </p>
                    </div>
                    <section>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Sessions / IPs</p>
                      <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px]">
                        {(drawerData.user.sessions ?? []).map((s) => (
                          <li key={s.id} className="rounded border border-white/5 px-2 py-1">
                            {sanitizePlainText(s.ip, 45)} · {sanitizePlainText(s.location, 80)} · {new Date(s.lastActive).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Recent uploads</p>
                      <ul className="max-h-40 space-y-1 overflow-y-auto">
                        {(drawerData.user.files ?? []).map((f) => (
                          <li key={f.id} className="rounded border border-white/5 px-2 py-1 font-mono text-[10px]">
                            <span className="text-[#FDE68A]">{sanitizePlainText(f.threatLevel, 16)}</span> · {sanitizePlainText(f.name, 160)}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Threat analyses</p>
                      <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px]">
                        {(drawerData.user.threatAnalyses ?? []).map((t) => (
                          <li key={t.id} className="rounded border border-white/5 px-2 py-1">
                            score {t.anomalyScore} · {sanitizePlainText(t.classification, 48)}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Security events</p>
                      <ul className="max-h-28 space-y-1 overflow-y-auto text-[10px]">
                        {(drawerData.user.securityEvents ?? []).map((e) => (
                          <li key={e.id} className="rounded border border-white/5 px-2 py-1">
                            {sanitizePlainText(e.eventType, 48)} · {sanitizePlainText(e.message, 280)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </>
                ) : (
                  <p className="text-[#64748B]">Unable to load forensic envelope.</p>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
