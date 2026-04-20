import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Ban, Copy, Download, LocateFixed, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const initialLogs = [
  { id: "l1", time: "08:10", user: "Admin Operator", email: "admin@test.com", ip: "10.1.2.12", location: "Berlin", device: "MacBook Pro", action: "Login", severity: "Low", result: "Success", risk: 26, session: "sess_1021" },
  { id: "l2", time: "08:44", user: "SOC Viewer", email: "soc.viewer@test.com", ip: "91.80.14.22", location: "Warsaw", device: "Windows Desktop", action: "API Probe", severity: "Critical", result: "Blocked", risk: 92, session: "sess_1034" },
  { id: "l3", time: "09:03", user: "User Analyst", email: "user@test.com", ip: "10.1.6.84", location: "Tashkent", device: "iPhone 15", action: "Upload", severity: "Medium", result: "Success", risk: 38, session: "sess_1042" },
  { id: "l4", time: "09:27", user: "Cloud Reviewer", email: "reviewer@test.com", ip: "185.22.41.90", location: "Amsterdam", device: "Windows Desktop", action: "Export", severity: "High", result: "Failed", risk: 74, session: "sess_1069" },
  { id: "l5", time: "10:02", user: "Unknown", email: "-", ip: "185.40.12.5", location: "Singapore", device: "Chrome Linux", action: "Delete", severity: "High", result: "Blocked", risk: 85, session: "sess_1092" },
  { id: "l6", time: "10:21", user: "Admin Operator", email: "admin@test.com", ip: "10.1.4.71", location: "Berlin", device: "MacBook Pro", action: "Export", severity: "Low", result: "Success", risk: 22, session: "sess_1096" },
  { id: "l7", time: "10:49", user: "User Analyst", email: "user@test.com", ip: "91.80.40.77", location: "Tashkent", device: "iPhone 15", action: "Login", severity: "Medium", result: "Failed", risk: 57, session: "sess_1103" },
  { id: "l8", time: "11:06", user: "Unknown", email: "-", ip: "185.90.77.112", location: "Amsterdam", device: "Edge Win", action: "API Probe", severity: "Critical", result: "Blocked", risk: 96, session: "sess_1107" },
];

const loginTrend = [
  { name: "08:00", value: 22 },
  { name: "09:00", value: 35 },
  { name: "10:00", value: 28 },
  { name: "11:00", value: 41 },
  { name: "12:00", value: 37 },
  { name: "13:00", value: 46 },
];

const suspiciousIps = [
  { ip: "185.22.41.90", hits: 31 },
  { ip: "91.80.14.22", hits: 26 },
  { ip: "185.90.77.112", hits: 24 },
  { ip: "91.80.40.77", hits: 18 },
];

const geoAttackSources = [
  { country: "Warsaw, PL", incidents: 34 },
  { country: "Amsterdam, NL", incidents: 29 },
  { country: "Singapore, SG", incidents: 26 },
  { country: "Tashkent, UZ", incidents: 19 },
  { country: "Berlin, DE", incidents: 13 },
];

const severityClass = (severity) =>
  severity === "Critical"
    ? "bg-[#EF4444]/20 text-[#FCA5A5]"
    : severity === "High"
      ? "bg-[#F97316]/20 text-[#FDBA74]"
      : severity === "Medium"
        ? "bg-[#F59E0B]/20 text-[#FDE68A]"
        : "bg-[#10B981]/20 text-[#86EFAC]";

const resultClass = (result) =>
  result === "Success"
    ? "bg-[#10B981]/20 text-[#6EE7B7]"
    : result === "Failed"
      ? "bg-[#F59E0B]/20 text-[#FDE68A]"
      : "bg-[#EF4444]/20 text-[#FCA5A5]";

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
  const offset = circumference - (score / 100) * circumference;
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
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#A5F3FC]">{score}</div>
    </div>
  );
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState(initialLogs);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [dateRange, setDateRange] = useState("Today");
  const [liveMode, setLiveMode] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerTab, setDrawerTab] = useState("Overview");
  const [toast, setToast] = useState("");
  const pageSize = 6;
  const debouncedQuery = useDebouncedValue(query, 180);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!liveMode) return undefined;
    const options = [
      { user: "Unknown", email: "-", ip: "185.40.12.5", location: "Singapore", device: "Chrome Linux", action: "API Probe", severity: "Critical", result: "Blocked", risk: 95 },
      { user: "User Analyst", email: "user@test.com", ip: "10.1.3.16", location: "Tashkent", device: "iPhone 15", action: "Upload", severity: "Low", result: "Success", risk: 31 },
      { user: "SOC Viewer", email: "soc.viewer@test.com", ip: "91.80.33.29", location: "Warsaw", device: "Windows Desktop", action: "Login", severity: "Medium", result: "Failed", risk: 63 },
    ];
    const interval = setInterval(() => {
      const pick = options[Math.floor(Math.random() * options.length)];
      const now = new Date();
      const next = {
        ...pick,
        id: `live-${Date.now()}`,
        session: `sess_${Math.floor(2000 + Math.random() * 9999)}`,
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      };
      setLogs((prev) => [next, ...prev].slice(0, 120));
    }, 4500);
    return () => clearInterval(interval);
  }, [liveMode]);

  const pushToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const q = debouncedQuery.toLowerCase();
        const matchesQuery =
          log.user.toLowerCase().includes(q) ||
          log.email.toLowerCase().includes(q) ||
          log.ip.includes(q) ||
          log.action.toLowerCase().includes(q);
        const matchesResult = resultFilter === "All" || log.result === resultFilter;
        const matchesAction = actionFilter === "All" || log.action === actionFilter;
        const matchesSeverity = severityFilter === "All" || log.severity === severityFilter;
        const matchesDate = dateRange === "Today" || dateRange === "Last 7 Days" || dateRange === "Last 30 Days";
        return matchesQuery && matchesResult && matchesAction && matchesSeverity && matchesDate;
      }),
    [logs, debouncedQuery, resultFilter, actionFilter, severityFilter, dateRange]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedLogs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const metrics = useMemo(() => {
    const failed = logs.filter((item) => item.result === "Failed").length;
    const blocked = logs.filter((item) => item.result === "Blocked").length;
    const critical = logs.filter((item) => item.severity === "Critical").length;
    return [
      { label: "Total Logs Today", value: logs.length, trend: "+12%", icon: ShieldCheck, color: "text-[#93C5FD]" },
      { label: "Failed Attempts", value: failed, trend: "+4%", icon: AlertTriangle, color: "text-[#FDE68A]" },
      { label: "Blocked IPs", value: blocked, trend: "+7%", icon: Ban, color: "text-[#FCA5A5]" },
      { label: "Critical Alerts", value: critical, trend: "+2%", icon: ShieldAlert, color: "text-[#F97316]" },
    ];
  }, [logs]);

  const resultDistribution = useMemo(() => {
    const success = logs.filter((item) => item.result === "Success").length;
    const failed = logs.filter((item) => item.result === "Failed").length;
    const blocked = logs.filter((item) => item.result === "Blocked").length;
    return [
      { name: "Success", value: success, color: "#10B981" },
      { name: "Failed", value: failed, color: "#F59E0B" },
      { name: "Blocked", value: blocked, color: "#EF4444" },
    ];
  }, [logs]);

  const clearFilters = () => {
    setQuery("");
    setResultFilter("All");
    setActionFilter("All");
    setSeverityFilter("All");
    setDateRange("Today");
    setPage(1);
  };

  const relatedAttempts = selectedLog
    ? [
        { id: "r1", text: "Rate-limit trigger from same subnet", time: "18m ago" },
        { id: "r2", text: "Credential mismatch on export endpoint", time: "27m ago" },
        { id: "r3", text: "Session anomaly from alternate ASN", time: "42m ago" },
      ]
    : [];

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
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Admin Audit Logs Center</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Enterprise-grade security telemetry and incident triage workspace.</p>
        </div>

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
                  <AnimatedCount value={metric.value} />
                </div>
                <div className="mt-1 text-xs text-[#6EE7B7]">{metric.trend} from previous cycle</div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Login Attempts Timeline</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loginTrend}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Result Distribution</div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resultDistribution} dataKey="value" innerRadius={50} outerRadius={82} paddingAngle={3}>
                    {resultDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-1 text-sm font-semibold text-[#E5E7EB]">Top Suspicious IPs</div>
            <div className="mb-3 text-xs text-[#64748B]">Highest repeated suspicious requests</div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={suspiciousIps} barCategoryGap={14}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="ip" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11 }} width={32} />
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
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
            <div className="mb-1 text-sm font-semibold text-[#E5E7EB]">Geo Attack Sources</div>
            <div className="mb-3 text-xs text-[#64748B]">Top locations with flagged security events</div>
            <div className="h-[220px] space-y-2 overflow-y-auto pr-1">
              {geoAttackSources.map((item) => (
                <div key={item.country} className="rounded-lg border border-white/10 bg-[#0F172A]/75 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[#D1D5DB]">{item.country}</span>
                    <span className="text-xs text-[#93C5FD]">{item.incidents} incidents</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (item.incidents / 40) * 100)}%` }}
                      transition={{ duration: 0.35 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] to-[#2563EB]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by email / IP / action" className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#3B82F6]/60" />
              <select value={resultFilter} onChange={(e) => { setResultFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>All</option><option>Success</option><option>Failed</option><option>Blocked</option>
              </select>
              <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>All</option><option>Login</option><option>Upload</option><option>Export</option><option>Delete</option><option>API Probe</option>
              </select>
              <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>Today</option><option>Last 7 Days</option><option>Last 30 Days</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-[#64748B]">Filter controls and stream tools</div>
              <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => pushToast("Audit stream refreshed")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB] transition hover:border-[#3B82F6]/35"><RefreshCw className="h-4 w-4" /> Refresh</button>
              <button type="button" onClick={() => pushToast("CSV exported")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/20"><Download className="h-4 w-4" /> Export CSV</button>
              <button type="button" onClick={clearFilters} className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#FCA5A5] transition hover:bg-[#EF4444]/20">Clear Filters</button>
              <button type="button" onClick={() => setLiveMode((prev) => !prev)} className={`rounded-lg border px-3 py-2 text-sm transition ${liveMode ? "border-[#3B82F6]/35 bg-[#3B82F6]/15 text-[#BFDBFE]" : "border-white/15 bg-white/5 text-[#D1D5DB]"}`}>
                Live Logs {liveMode ? "ON" : "OFF"}
              </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95">
          {loading ? (
            <div className="space-y-2 p-4">{[...Array(7)].map((_, idx) => <div key={`sk-${idx}`} className="h-11 animate-pulse rounded-lg bg-white/5" />)}</div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[1160px]">
                  <thead className="sticky top-0 z-10 bg-[#0F172A] shadow-[0_10px_18px_rgba(2,6,23,0.45)]">
                    <tr className="text-left text-xs uppercase tracking-wide text-[#9CA3AF]">
                      {["Time", "User", "Email", "IP", "Location", "Device", "Action", "Severity", "Result", "Actions"].map((h) => (
                        <th key={h} className="px-3 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {pagedLogs.map((row, idx) => (
                        <motion.tr
                          key={row.id}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`group cursor-pointer border-t border-white/5 text-sm text-[#E5E7EB] transition hover:bg-[#1A2436]/75 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)] ${
                            idx % 2 === 0 ? "bg-[#0F172A]/55" : "bg-[#111827]/65"
                          } ${selectedLog?.id === row.id ? "shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)] bg-[#1E293B]/85" : ""}`}
                          onClick={() => {
                            setSelectedLog(row);
                            setDrawerTab("Overview");
                          }}
                        >
                          <td className="px-3 py-3">{row.time}</td>
                          <td className="px-3 py-3">{row.user}</td>
                          <td className="px-3 py-3 text-[#C7D2FE]">{row.email}</td>
                          <td className="px-3 py-3 font-mono text-[#93C5FD]">{row.ip}</td>
                          <td className="px-3 py-3">{row.location}</td>
                          <td className="px-3 py-3">{row.device}</td>
                          <td className="px-3 py-3">{row.action}</td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${severityClass(row.severity)}`}>{row.severity}</span></td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${resultClass(row.result)}`}>{row.result}</span></td>
                          <td className="px-3 py-3">
                            <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.ip); pushToast("IP copied"); }} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-[#9CA3AF] hover:border-[#3B82F6]/35 hover:text-[#BFDBFE]">
                              <Copy className="h-3.5 w-3.5" /> Copy IP
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#9CA3AF]">
                <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-35">Prev</button>
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-35">Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.button type="button" onClick={() => setSelectedLog(null)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.26, ease: "easeOut" }} className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[430px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.16)]">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="mb-1 text-sm font-semibold text-white">Audit Event Details</div>
                <div className="text-xs text-[#94A3B8]">Session {selectedLog.session}</div>
                <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-[#111827]/65 p-1 text-xs">
                  {["Overview", "Threat Intel", "History", "Actions"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDrawerTab(tab)}
                      className={`rounded-md px-2 py-1.5 transition ${
                        drawerTab === tab ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "text-[#9CA3AF] hover:bg-white/5 hover:text-[#BFDBFE]"
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
                    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-[#D1D5DB]">
                        <div>Event: <span className="text-[#BFDBFE]">{selectedLog.action}</span></div>
                        <div>User: {selectedLog.user} ({selectedLog.email})</div>
                        <div>Time: {selectedLog.time}</div>
                        <div>Result: <span className={selectedLog.result === "Success" ? "text-[#6EE7B7]" : "text-[#FCA5A5]"}>{selectedLog.result}</span></div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-[#D1D5DB]">
                        <div className="inline-flex items-center gap-1"><LocateFixed className="h-4 w-4 text-[#93C5FD]" /> Geo Location:
                          <span className="ml-1 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-xs text-[#BFDBFE]">{selectedLog.location}</span>
                        </div>
                        <div>IP: {selectedLog.ip}</div>
                        <div>Browser/Device: {selectedLog.device}</div>
                      </div>
                    </motion.div>
                  )}

                  {drawerTab === "Threat Intel" && (
                    <motion.div key="intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                        <div className="mb-2 text-xs uppercase tracking-wide text-[#94A3B8]">Risk Score</div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-[#D1D5DB]">Threat confidence and behavior correlation index</div>
                          <RiskGauge score={selectedLog.risk} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-xs text-[#9CA3AF]">
                        <div>- ASN flagged for repeated auth anomalies</div>
                        <div>- Endpoint pattern matches previous probe signatures</div>
                      </div>
                    </motion.div>
                  )}

                  {drawerTab === "History" && (
                    <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                      <div className="mb-1 text-xs uppercase tracking-wide text-[#94A3B8]">Related Attempts Timeline</div>
                      {relatedAttempts.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/10 bg-[#111827]/70 p-2.5 text-xs text-[#D1D5DB]">
                          <div className="font-medium text-[#BFDBFE]">{item.text}</div>
                          <div className="mt-0.5 text-[#64748B]">{item.time}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {drawerTab === "Actions" && (
                    <motion.div key="actions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                      <button type="button" onClick={() => pushToast(`Blocked ${selectedLog.ip}`)} className="w-full rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 px-3 py-2 text-sm text-[#FCA5A5] transition hover:bg-[#EF4444]/20">Block IP</button>
                      <button type="button" onClick={() => pushToast(`Suspended ${selectedLog.user}`)} className="w-full rounded-lg border border-[#F97316]/30 bg-[#F97316]/15 px-3 py-2 text-sm text-[#FDBA74] transition hover:bg-[#F97316]/20">Suspend User</button>
                      <button type="button" onClick={() => pushToast("Force logout executed")} className="w-full rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-3 py-2 text-sm text-[#FDE68A] transition hover:bg-[#F59E0B]/20">Force Logout</button>
                      <button type="button" onClick={() => pushToast("Marked safe")} className="w-full rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/20">Mark Safe</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3">
                <button type="button" onClick={() => pushToast(`Blocked ${selectedLog.ip}`)} className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 px-2 py-2 text-xs text-[#FCA5A5]">Block IP</button>
                <button type="button" onClick={() => pushToast(`Suspended ${selectedLog.user}`)} className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/15 px-2 py-2 text-xs text-[#FDBA74]">Suspend User</button>
                <button type="button" onClick={() => pushToast("Force logout executed")} className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/15 px-2 py-2 text-xs text-[#FDE68A]">Force Logout</button>
                <button type="button" onClick={() => pushToast("Marked safe")} className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-2 py-2 text-xs text-[#A7F3D0]">Mark Safe</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-4 right-4 z-[80] rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(59,130,246,0.24)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
