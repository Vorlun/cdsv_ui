import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Ban, Loader2, Search, ShieldAlert, ShieldCheck, ShieldX, Siren, Zap } from "lucide-react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const initialIncidents = [
  { id: "TR-301", type: "Credential Stuffing", ip: "185.22.31.90", severity: "Critical", attempts: 184, detectedAt: "12:04", status: "Active" },
  { id: "TR-302", type: "API Abuse", ip: "91.80.42.19", severity: "High", attempts: 122, detectedAt: "12:07", status: "Investigating" },
  { id: "TR-303", type: "Botnet Probe", ip: "179.11.22.10", severity: "Medium", attempts: 71, detectedAt: "12:11", status: "Active" },
  { id: "TR-304", type: "Malware Upload", ip: "185.40.11.102", severity: "Critical", attempts: 39, detectedAt: "12:14", status: "Blocked" },
  { id: "TR-305", type: "Brute Force", ip: "91.80.27.9", severity: "High", attempts: 96, detectedAt: "12:17", status: "Active" },
  { id: "TR-306", type: "Token Replay", ip: "10.1.4.18", severity: "Medium", attempts: 28, detectedAt: "12:23", status: "Active" },
];

const attackTypes = [
  { name: "Credential Stuffing", value: 34, color: "#EF4444" },
  { name: "API Abuse", value: 26, color: "#F97316" },
  { name: "Botnet", value: 22, color: "#3B82F6" },
  { name: "Malware", value: 18, color: "#F59E0B" },
];

const threatTimeline = [
  { time: "08:00", threats: 14 },
  { time: "09:00", threats: 22 },
  { time: "10:00", threats: 17 },
  { time: "11:00", threats: 28 },
  { time: "12:00", threats: 31 },
  { time: "13:00", threats: 25 },
];

const topCountries = [
  { country: "Singapore", count: 38 },
  { country: "Netherlands", count: 29 },
  { country: "Germany", count: 23 },
  { country: "Poland", count: 17 },
  { country: "Uzbekistan", count: 14 },
];

const mapNodes = [
  { id: "berlin", x: 48, y: 30, label: "Berlin" },
  { id: "warsaw", x: 58, y: 28, label: "Warsaw" },
  { id: "tashkent", x: 74, y: 34, label: "Tashkent" },
  { id: "singapore", x: 80, y: 62, label: "Singapore" },
  { id: "amsterdam", x: 44, y: 26, label: "Amsterdam" },
];

const ipGeoMap = {
  "185.22.31.90": "Amsterdam, NL",
  "91.80.42.19": "Warsaw, PL",
  "179.11.22.10": "Sao Paulo, BR",
  "185.40.11.102": "Singapore, SG",
  "91.80.27.9": "Tashkent, UZ",
  "10.1.4.18": "Berlin, DE",
};

function severityClass(severity) {
  if (severity === "Critical") return "bg-[#EF4444]/20 text-[#FCA5A5]";
  if (severity === "High") return "bg-[#F97316]/20 text-[#FDBA74]";
  return "bg-[#F59E0B]/20 text-[#FDE68A]";
}

function statusClass(status) {
  if (status === "Blocked") return "bg-[#10B981]/20 text-[#6EE7B7]";
  if (status === "Investigating") return "bg-[#F59E0B]/20 text-[#FDE68A]";
  return "bg-[#EF4444]/20 text-[#FCA5A5]";
}

function statusDot(status) {
  if (status === "Blocked") return "bg-[#10B981]";
  if (status === "Investigating") return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const frames = 26;
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / frames, 1);
      setDisplay(Math.round(value * progress));
      if (progress >= 1) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

export default function AdminThreatsPage() {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [feed, setFeed] = useState([
    { id: "f1", text: "Critical credential stuffing blocked from 185.22.31.90", time: "Just now", severity: "Critical" },
    { id: "f2", text: "Suspicious API probe from 91.80.42.19", time: "1m ago", severity: "High" },
    { id: "f3", text: "Botnet behavior signature matched in upload endpoint", time: "3m ago", severity: "Medium" },
  ]);
  const [toast, setToast] = useState("");
  const [activeInvestigation, setActiveInvestigation] = useState(null);
  const [activeTypeIndex, setActiveTypeIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const samples = [
      { text: "WAF auto-rule triggered for repeated token replay", severity: "High" },
      { text: "Threat intel correlation increased risk score by +8", severity: "Medium" },
      { text: "Critical malware payload quarantined before storage", severity: "Critical" },
      { text: "Geo anomaly detected: session hopping across regions", severity: "High" },
    ];
    const interval = setInterval(() => {
      const now = new Date();
      const sample = samples[Math.floor(Math.random() * samples.length)];
      setFeed((prev) => [
        {
          id: `f-${Date.now()}`,
          text: sample.text,
          severity: sample.severity,
          time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        },
        ...prev,
      ].slice(0, 14));
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const active = incidents.filter((item) => item.status === "Active").length;
    const blocked = incidents.filter((item) => item.status === "Blocked").length;
    const suspicious = incidents.reduce((sum, item) => sum + item.attempts, 0);
    return [
      { label: "Active Threats", value: active, trend: "+12%", icon: Siren, color: "text-[#FCA5A5]" },
      { label: "Blocked Today", value: blocked, trend: "+6%", icon: Ban, color: "text-[#6EE7B7]" },
      { label: "Suspicious Sessions", value: suspicious, trend: "+18%", icon: AlertTriangle, color: "text-[#FDE68A]" },
      { label: "Global Risk Score", value: 87, trend: "+3%", icon: ShieldAlert, color: "text-[#FDBA74]" },
    ];
  }, [incidents]);

  const totalThreatsToday = useMemo(() => incidents.length, [incidents]);

  const actionToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2200);
  };

  const handleAction = (id, action) => {
    const selected = incidents.find((item) => item.id === id);
    if (!selected) return;

    if (action === "investigate") {
      setActiveInvestigation({
        ...selected,
        geo: ipGeoMap[selected.ip] || "Unknown",
        fingerprint: `dfp-${selected.id.toLowerCase()}-${selected.ip.replace(/\./g, "")}`,
        previousIncidents: [
          `${selected.ip} triggered abnormal auth pattern 2h ago`,
          `${selected.type} signature observed on upload endpoint`,
          "Risk policy engine elevated incident confidence",
        ],
        attemptsGraph: [
          { tick: "00m", value: Math.max(5, Math.round(selected.attempts * 0.2)) },
          { tick: "10m", value: Math.max(8, Math.round(selected.attempts * 0.42)) },
          { tick: "20m", value: Math.max(12, Math.round(selected.attempts * 0.58)) },
          { tick: "30m", value: Math.max(14, Math.round(selected.attempts * 0.76)) },
          { tick: "40m", value: selected.attempts },
        ],
        aiRiskScore: Math.min(99, Math.max(55, selected.attempts % 100)),
        recommendation:
          selected.severity === "Critical"
            ? "Immediate block + force token reset + isolate affected session scope."
            : "Contain source IP and monitor threat signature with elevated anomaly thresholds.",
      });
      actionToast(`Investigation opened for ${id}`);
      return;
    }
    if (action === "block") {
      setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Blocked" } : item)));
      actionToast(`Threat ${id} blocked`);
      return;
    }
    if (action === "ignore") {
      setIncidents((prev) => prev.filter((item) => item.id !== id));
      if (activeInvestigation?.id === id) setActiveInvestigation(null);
      actionToast(`Threat ${id} removed from active list`);
    }
  };

  const executeAction = (id, action) => {
    setActionLoading((prev) => ({ ...prev, [`${id}-${action}`]: true }));
    setTimeout(() => {
      handleAction(id, action);
      setActionLoading((prev) => ({ ...prev, [`${id}-${action}`]: false }));
    }, 520);
  };

  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-0 top-10 h-[420px] w-[420px] rounded-full bg-[#EF4444]/10 blur-3xl" animate={{ x: [0, 16, 0], y: [0, -10, 0] }} transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute right-0 top-24 h-[420px] w-[420px] rounded-full bg-[#3B82F6]/12 blur-3xl" animate={{ x: [0, -18, 0], y: [0, 8, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/3 top-1/2 h-[340px] w-[340px] rounded-full bg-[#22D3EE]/8 blur-3xl" animate={{ x: [0, 14, 0], y: [0, 12, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-white/10 bg-[#0F172A]/90 p-5 shadow-[0_0_24px_rgba(59,130,246,0.14)]">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Threat Command Center</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Real-time detection and response workspace</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-2xl border border-[#EF4444]/20 bg-white/[0.04] p-4 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(249,115,22,0.18)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{metric.label}</span>
                  <span className="rounded-lg border border-white/10 bg-[#0B1220] p-2"><Icon className={`h-4 w-4 ${metric.color}`} /></span>
                </div>
                <div className="text-3xl font-bold text-white"><AnimatedCount value={metric.value} /></div>
                <div className="mt-1 text-xs text-[#FDBA74]">{metric.trend} in last hour</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Live World Attack Map</div>
            <div className="relative h-[290px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#111827]">
              <svg viewBox="0 0 100 70" className="h-full w-full">
                {mapNodes.map((node) => (
                  <g key={node.id}>
                    <motion.circle cx={node.x} cy={node.y} r="1.4" fill="#22D3EE" animate={{ r: [1.2, 1.8, 1.2], opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.3, repeat: Infinity }} />
                    <text x={node.x + 1.8} y={node.y - 1.5} fill="#94A3B8" fontSize="2.3">{node.label}</text>
                  </g>
                ))}
                <motion.path d="M58 28 C63 30, 70 32, 80 62" stroke="#EF4444" strokeWidth="0.55" fill="none" strokeDasharray="2 2" animate={{ strokeDashoffset: [6, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} />
                <motion.path d="M44 26 C49 29, 58 33, 74 34" stroke="#F97316" strokeWidth="0.55" fill="none" strokeDasharray="2 2" animate={{ strokeDashoffset: [8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                <motion.path d="M80 62 C70 48, 62 38, 48 30" stroke="#EF4444" strokeWidth="0.55" fill="none" strokeDasharray="2 2" animate={{ strokeDashoffset: [10, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: "linear" }} />
              </svg>
              <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-[#EF4444]/25 bg-[#EF4444]/10 px-2 py-1 text-[10px] text-[#FCA5A5]">Threat pulse live</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Live Threat Feed</div>
            <div className="h-[290px] space-y-2 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {feed.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 ${item.severity === "Critical" ? "text-[#FCA5A5]" : item.severity === "High" ? "text-[#FDBA74]" : "text-[#FDE68A]"}`}>
                        <Zap className="h-3.5 w-3.5" />
                        {item.severity}
                      </span>
                      <span className="text-[#64748B]">{item.time}</span>
                    </div>
                    <div className="text-[#D1D5DB]">{item.text}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Threat Incidents</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {incidents.map((threat) => (
              <motion.div key={threat.id} whileHover={{ y: -4 }} className={`rounded-xl border bg-[#0F172A]/85 p-3 shadow-[0_0_14px_rgba(239,68,68,0.08)] transition duration-200 hover:border-[#EF4444]/45 hover:shadow-[0_0_18px_rgba(239,68,68,0.2)] ${threat.severity === "Critical" ? "border-[#EF4444]/35 animate-[pulse_2.4s_ease-in-out_infinite]" : "border-[#EF4444]/20"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{threat.id}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${statusClass(threat.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot(threat.status)}`} />
                    {threat.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">{threat.type}</div>
                <div className="mt-1 text-xs text-[#9CA3AF]">Source IP: <span className="font-mono text-[#93C5FD]">{threat.ip}</span></div>
                <div className="mt-1 text-xs text-[#9CA3AF]">Attempts: <span className="text-[#FDE68A]">{threat.attempts}</span></div>
                <div className="mt-1 text-xs text-[#9CA3AF]">Time detected: {threat.detectedAt}</div>
                <div className="mt-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${severityClass(threat.severity)}`}>{threat.severity}</span></div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => executeAction(threat.id, "investigate")} className="inline-flex items-center justify-center gap-1 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-1.5 text-[11px] text-[#BFDBFE] shadow-[0_0_12px_rgba(59,130,246,0.2)] transition hover:bg-[#3B82F6]/20 active:scale-[0.98]">{actionLoading[`${threat.id}-investigate`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Investigate</button>
                  <button type="button" onClick={() => executeAction(threat.id, "block")} className="inline-flex items-center justify-center gap-1 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1.5 text-[11px] text-[#FCA5A5] transition hover:bg-[#EF4444]/25 active:scale-[0.98]">{actionLoading[`${threat.id}-block`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}Block</button>
                  <button type="button" onClick={() => executeAction(threat.id, "ignore")} className="inline-flex items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-[#9CA3AF] transition hover:bg-white/10 active:scale-[0.98]">{actionLoading[`${threat.id}-ignore`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}Ignore</button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Attack Types</div>
            <div className="grid items-center gap-2 md:grid-cols-[1fr_1fr]">
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attackTypes} dataKey="value" innerRadius={52} outerRadius={84} paddingAngle={3} isAnimationActive animationDuration={900} onMouseEnter={(_, idx) => setActiveTypeIndex(idx)}>
                      {attackTypes.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} stroke={index === activeTypeIndex ? "#F8FAFC" : "transparent"} strokeWidth={index === activeTypeIndex ? 2 : 0} style={{ filter: index === activeTypeIndex ? "drop-shadow(0 0 8px rgba(248,250,252,0.35))" : undefined }} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wide text-[#64748B]">Total Threats Today</span>
                  <span className="text-3xl font-bold text-white"><AnimatedCount value={totalThreatsToday} /></span>
                  <span className="text-[11px] text-[#94A3B8]">Detected today</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {attackTypes.map((item) => (
                  <div key={item.name} className={`rounded-lg border px-2.5 py-2 text-xs transition ${attackTypes[activeTypeIndex].name === item.name ? "border-[#F8FAFC]/30 bg-[#0F172A]/90 shadow-[0_0_16px_rgba(248,250,252,0.1)]" : "border-white/10 bg-[#0F172A]/70"}`}>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[#D1D5DB]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span>
                      <span className="text-[#FDE68A]"><AnimatedCount value={item.value} />%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#E5E7EB]">
              <span className="relative inline-flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#F97316]" /></span>
              Threat Timeline
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={threatTimeline}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="threats" stroke="#F97316" strokeWidth={2.6} isAnimationActive animationDuration={850} activeDot={{ r: 6, stroke: "#FDBA74", strokeWidth: 2, fill: "#F97316" }} dot={(props) => {
                    const { cx, cy, index } = props;
                    const isLast = index === threatTimeline.length - 1;
                    return <g><circle cx={cx} cy={cy} r={3.2} fill="#F97316" />{isLast ? <circle cx={cx} cy={cy} r={7} fill="#F97316" opacity="0.35"><animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite" /></circle> : null}</g>;
                  }} style={{ filter: "drop-shadow(0 0 8px rgba(249,115,22,0.45))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#E5E7EB]">
              <span className="relative inline-flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22D3EE] opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /></span>
              Top Countries
            </div>
            <div className="space-y-2">
              {topCountries.map((row, index) => (
                <div key={row.country} className="rounded-lg border border-white/10 bg-[#0F172A]/70 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">#{index + 1}</span>
                    <span className="text-[#FDE68A]">{row.count}</span>
                  </div>
                  <div className="mb-1 text-sm text-[#E5E7EB]">{row.country}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (row.count / topCountries[0].count) * 100)}%` }} transition={{ duration: 0.45, delay: index * 0.05 }} className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#22D3EE]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activeInvestigation && (
          <>
            <motion.button type="button" onClick={() => setActiveInvestigation(null)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.26, ease: "easeOut" }} className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[430px] flex-col border-l border-[#EF4444]/30 bg-[#0F172A] shadow-[-18px_0_45px_rgba(239,68,68,0.14)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-white">Investigation Panel</div>
                  <div className="text-xs text-[#94A3B8]">{activeInvestigation.id}</div>
                </div>
                <button type="button" onClick={() => setActiveInvestigation(null)} className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white">Close</button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
                <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3 text-[#D1D5DB]">
                  <div>Threat ID: <span className="text-[#BFDBFE]">{activeInvestigation.id}</span></div>
                  <div>Source IP: <span className="font-mono text-[#93C5FD]">{activeInvestigation.ip}</span></div>
                  <div>Geo location: {activeInvestigation.geo}</div>
                  <div>Device fingerprint: <span className="text-[#D1D5DB]">{activeInvestigation.fingerprint}</span></div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#94A3B8]">Attempts Graph</div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activeInvestigation.attemptsGraph}>
                        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                        <XAxis dataKey="tick" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }} />
                        <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2.2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#94A3B8]">Previous Incidents</div>
                  <ul className="space-y-1 text-xs text-[#9CA3AF]">{activeInvestigation.previousIncidents.map((item) => <li key={item}>- {item}</li>)}</ul>
                </div>
                <div className="rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/10 p-3 text-xs">
                  <div className="text-[#FCA5A5]">AI risk score: <span className="font-semibold">{activeInvestigation.aiRiskScore}</span></div>
                  <div className="mt-1 text-[#FECACA]">{activeInvestigation.recommendation}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3">
                <button type="button" onClick={() => executeAction(activeInvestigation.id, "block")} className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-2 text-xs text-[#FCA5A5]">Block</button>
                <button type="button" onClick={() => { actionToast("Threat response playbook assigned"); setActiveInvestigation(null); }} className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-2 text-xs text-[#BFDBFE]">Assign Response</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed bottom-4 right-4 z-[80] rounded-lg border border-[#EF4444]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(239,68,68,0.25)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
