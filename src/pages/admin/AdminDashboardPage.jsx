import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Users,
  UserX,
  X,
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

const baseMetricCards = [
  { key: "users", label: "Total Users", value: 1284, trend: "+12%", icon: Users, iconColor: "text-[#60A5FA]", borderGlow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]", spark: [20, 24, 28, 27, 30, 34, 36] },
  { key: "uploads", label: "Total Uploads", value: 9742, trend: "+8%", icon: UploadCloud, iconColor: "text-[#34D399]", borderGlow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]", spark: [12, 13, 17, 18, 19, 22, 24] },
  { key: "failed", label: "Failed Logins", value: 83, trend: "-3%", icon: UserX, iconColor: "text-[#FCD34D]", borderGlow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]", spark: [14, 13, 12, 12, 10, 9, 8] },
  { key: "blocked", label: "Blocked IPs", value: 27, trend: "+6%", icon: Ban, iconColor: "text-[#F87171]", borderGlow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.35)]", spark: [6, 8, 7, 9, 10, 11, 13] },
  { key: "threats", label: "Threat Alerts", value: 12, trend: "+2%", icon: ShieldAlert, iconColor: "text-[#C084FC]", borderGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]", spark: [4, 5, 7, 7, 8, 9, 10] },
];

const chartSeries = {
  daily: {
    loginAttempts: [{ time: "00:00", attempts: 120 }, { time: "04:00", attempts: 92 }, { time: "08:00", attempts: 230 }, { time: "12:00", attempts: 310 }, { time: "16:00", attempts: 268 }, { time: "20:00", attempts: 190 }],
    uploadsThreats: [{ label: "Mon", uploads: 320, threats: 18 }, { label: "Tue", uploads: 420, threats: 22 }, { label: "Wed", uploads: 390, threats: 17 }, { label: "Thu", uploads: 460, threats: 25 }, { label: "Fri", uploads: 510, threats: 28 }, { label: "Sat", uploads: 280, threats: 11 }, { label: "Sun", uploads: 260, threats: 9 }],
  },
  weekly: {
    loginAttempts: [{ time: "W1", attempts: 1060 }, { time: "W2", attempts: 1220 }, { time: "W3", attempts: 1410 }, { time: "W4", attempts: 1340 }],
    uploadsThreats: [{ label: "W1", uploads: 2020, threats: 96 }, { label: "W2", uploads: 2290, threats: 121 }, { label: "W3", uploads: 2410, threats: 107 }, { label: "W4", uploads: 2540, threats: 119 }],
  },
  monthly: {
    loginAttempts: [{ time: "Jan", attempts: 4020 }, { time: "Feb", attempts: 4210 }, { time: "Mar", attempts: 4480 }, { time: "Apr", attempts: 4630 }, { time: "May", attempts: 4870 }, { time: "Jun", attempts: 4790 }],
    uploadsThreats: [{ label: "Jan", uploads: 9200, threats: 380 }, { label: "Feb", uploads: 9850, threats: 421 }, { label: "Mar", uploads: 10120, threats: 405 }, { label: "Apr", uploads: 10790, threats: 438 }, { label: "May", uploads: 11040, threats: 462 }, { label: "Jun", uploads: 10880, threats: 447 }],
  },
};

const threatDistributionData = [
  { name: "Malware Uploads", percent: 32, count: 128, color: "#EF4444" },
  { name: "Suspicious Logins", percent: 25, count: 97, color: "#F59E0B" },
  { name: "API Abuse Attempts", percent: 23, count: 89, color: "#3B82F6" },
  { name: "Blocked Requests", percent: 20, count: 76, color: "#10B981" },
];

const initialThreatAlerts = [
  { id: "A1", message: "Brute force attempt detected", severity: "Critical", ago: "1m ago", dismissed: false },
  { id: "A2", message: "Suspicious login from new country", severity: "High", ago: "4m ago", dismissed: false },
  { id: "A3", message: "Too many failed requests", severity: "Medium", ago: "9m ago", dismissed: false },
  { id: "A4", message: "Unauthorized API access blocked", severity: "High", ago: "12m ago", dismissed: false },
];

const initialLogs = [
  { time: "09:10", user: "Admin Operator", email: "admin@test.com", ip: "10.1.1.20", action: "Login", result: "Success" },
  { time: "09:34", user: "User Analyst", email: "user@test.com", ip: "10.1.1.34", action: "Upload", result: "Success" },
  { time: "10:05", user: "Unknown", email: "-", ip: "185.23.11.92", action: "Login", result: "Blocked" },
  { time: "10:18", user: "SOC Viewer", email: "soc.viewer@test.com", ip: "192.168.4.20", action: "Export", result: "Success" },
  { time: "10:40", user: "Unknown", email: "-", ip: "91.80.27.9", action: "API Probe", result: "Blocked" },
  { time: "11:12", user: "User Analyst", email: "user@test.com", ip: "10.1.1.34", action: "Delete", result: "Denied" },
];

const adminUsers = ["Admin Operator", "SOC Viewer", "User Analyst"];
const severityClass = { Low: "bg-[#10B981]/20 text-[#6EE7B7]", Medium: "bg-[#F59E0B]/20 text-[#FCD34D]", High: "bg-[#EF4444]/20 text-[#FCA5A5]", Critical: "bg-[#B91C1C]/30 text-[#FCA5A5]" };
const scanStages = [
  "Checking active sessions...",
  "Inspecting suspicious IP traffic...",
  "Verifying token abuse patterns...",
  "Scanning uploads...",
  "Finalizing report...",
];

function Modal({ title, children, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const firstButton = containerRef.current?.querySelector("button");
    firstButton?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#E5E7EB]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-[#3B82F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function ReportDrawer({ open, onClose, onExportPdf, onRerunScan, reportTimestamp }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close report drawer backdrop"
          />
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%", opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.92 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.14)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0F172A]/95 px-5 py-4 backdrop-blur">
              <h3 className="text-base font-semibold text-[#E5E7EB]">Security Scan Report</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-[#3B82F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
                <p className="text-xs text-[#9CA3AF]">Timestamp</p>
                <p className="text-sm font-medium text-[#E5E7EB]">{reportTimestamp}</p>
              </div>

              <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3">
                <p className="text-xs uppercase tracking-wide text-[#FCD34D]">Scan Summary</p>
                <div className="mt-2 space-y-1 text-[#E5E7EB]">
                  <p>Status: <span className="text-[#FCD34D]">Medium Severity Anomalies Detected</span></p>
                  <p>Security Health Score: <span className="font-semibold">92/100</span></p>
                  <p>Medium Alerts: 4</p>
                  <p>Blocked Requests Today: 22</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Detected Issues</p>
                {[
                  { issue: "Suspicious login bursts detected", severity: "Medium" },
                  { issue: "Repeated failed token validation attempts", severity: "Medium" },
                  { issue: "High API request spike blocked", severity: "Low" },
                  { issue: "Unknown IP probing behavior", severity: "Medium" },
                ].map((item) => (
                  <div key={item.issue} className="rounded-xl border border-white/10 bg-[#111827] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[#E5E7EB]">{item.issue}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                        item.severity === "Low"
                          ? "bg-[#10B981]/20 text-[#6EE7B7]"
                          : "bg-[#F59E0B]/20 text-[#FCD34D]"
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Security Metrics</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[#E5E7EB]">
                  <p>Active Sessions: 219</p>
                  <p>Failed Logins: 83</p>
                  <p>Blocked IPs: 2</p>
                  <p>Threat Alerts: 5</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Recommendations</p>
                <ul className="mt-2 space-y-1 text-[#E5E7EB]">
                  {[
                    "Enable stricter rate limiting",
                    "Review suspicious IP addresses",
                    "Rotate admin tokens",
                    "Continue traffic monitoring",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex gap-2 border-t border-white/10 bg-[#0F172A]/95 px-5 py-3 backdrop-blur">
              <button
                onClick={onExportPdf}
                className="flex-1 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-xs text-[#BFDBFE] hover:bg-[#3B82F6]/20"
              >
                Export PDF
              </button>
              <button
                onClick={onRerunScan}
                className="flex-1 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-xs text-[#A7F3D0] hover:bg-[#10B981]/20"
              >
                Re-run Scan
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 650;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const progress = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(value * progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [chartRange, setChartRange] = useState("daily");
  const [logs, setLogs] = useState(initialLogs);
  const [threatAlerts, setThreatAlerts] = useState(initialThreatAlerts);
  const [blockedIps, setBlockedIps] = useState(["185.23.11.92", "91.80.27.9"]);
  const [activeSessions, setActiveSessions] = useState(214);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [scanState, setScanState] = useState({ running: false, progress: 0, result: "" });
  const [modal, setModal] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [blockIpInput, setBlockIpInput] = useState("");
  const [forceLogoutUser, setForceLogoutUser] = useState(adminUsers[0]);
  const [sortBy, setSortBy] = useState({ key: "time", direction: "desc" });
  const [toasts, setToasts] = useState([]);
  const [activeThreatSlice, setActiveThreatSlice] = useState(0);
  const [reportTimestamp, setReportTimestamp] = useState("");
  const toastIdRef = useRef(0);
  const pageSize = 4;
  const healthScore = 92;

  const pushToast = (message, tone = "info") => {
    const id = `toast-${toastIdRef.current++}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 2500);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSessions((prev) => Math.max(100, prev + Math.floor(Math.random() * 7) - 3));
      setThreatAlerts((prev) => {
        const updated = prev.map((item, idx) => ({ ...item, ago: `${1 + idx + Math.floor(Math.random() * 3)}m ago` }));
        if (Math.random() > 0.72) {
          const newAlert = { id: `A-${Date.now()}`, message: "Critical token abuse pattern detected", severity: "Critical", ago: "just now", dismissed: false };
          if (soundEnabled) window.navigator.vibrate?.(120);
          return [newAlert, ...updated].slice(0, 6);
        }
        return updated;
      });
      setLogs((prev) => {
        if (Math.random() < 0.55) return prev;
        const candidates = [
          { user: "Unknown", email: "-", action: "Login", result: "Blocked", ip: "203.11.2.90" },
          { user: "User Analyst", email: "user@test.com", action: "Upload", result: "Success", ip: "10.1.1.34" },
          { user: "SOC Viewer", email: "soc.viewer@test.com", action: "Export", result: "Success", ip: "192.168.4.20" },
        ];
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return [{ time, ...picked }, ...prev].slice(0, 20);
      });
    }, 5500);
    return () => window.clearInterval(interval);
  }, [soundEnabled]);

  const metricCards = useMemo(() => {
    const blockedCount = blockedIps.length;
    const threatCount = threatAlerts.filter((item) => !item.dismissed).length;
    return baseMetricCards.map((card) => {
      if (card.key === "blocked") return { ...card, value: String(blockedCount) };
      if (card.key === "threats") return { ...card, value: String(threatCount) };
      return card;
    });
  }, [blockedIps.length, threatAlerts]);

  const filteredLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => {
      const direction = sortBy.direction === "asc" ? 1 : -1;
      return String(a[sortBy.key]).localeCompare(String(b[sortBy.key])) * direction;
    });
    return sorted.filter((item) => {
      const queryMatch = item.user.toLowerCase().includes(query.toLowerCase()) || item.email.toLowerCase().includes(query.toLowerCase()) || item.ip.includes(query) || item.action.toLowerCase().includes(query.toLowerCase());
      const statusMatch = status === "all" ? true : item.result.toLowerCase() === status.toLowerCase();
      return queryMatch && statusMatch;
    });
  }, [logs, query, status, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const visibleAlerts = threatAlerts.filter((item) => !item.dismissed);
  const chartData = chartSeries[chartRange];

  const triggerRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs((prev) => [...prev].sort(() => Math.random() - 0.5));
      setLoading(false);
      pushToast("Dashboard data refreshed", "success");
    }, 1200);
  };

  const runSecurityScan = () => {
    if (scanState.running) return;
    const threatDetected = Math.random() > 0.65;
    setScanState({
      running: true,
      progress: 0,
      result: "",
      stage: scanStages[0],
      mediumAlerts: 0,
      blockedToday: 0,
      threatDetected,
    });
    const interval = window.setInterval(() => {
      setScanState((prev) => {
        const nextProgress = prev.progress + 8;
        const stageIndex = Math.min(
          scanStages.length - 1,
          Math.floor((nextProgress / 100) * scanStages.length)
        );
        if (nextProgress >= 100) {
          window.clearInterval(interval);
          return {
            running: false,
            progress: 100,
            stage: scanStages[scanStages.length - 1],
            result: prev.threatDetected
              ? "Medium severity anomalies detected"
              : "No critical threats found",
            mediumAlerts: prev.threatDetected ? 4 : 2,
            blockedToday: prev.threatDetected ? 22 : 14,
            threatDetected: prev.threatDetected,
          };
        }
        return { ...prev, progress: nextProgress, stage: scanStages[stageIndex] };
      });
    }, 240);
  };

  const exportLogs = () => {
    const csv = ["time,user,email,ip,action,result", ...filteredLogs.map((item) => `${item.time},"${item.user}","${item.email}","${item.ip}","${item.action}","${item.result}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-logs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("Logs exported as CSV", "success");
  };

  const confirmBlockIp = () => {
    if (!blockIpInput.trim()) return;
    setBlockedIps((prev) => Array.from(new Set([blockIpInput.trim(), ...prev])));
    setModal(null);
    setBlockIpInput("");
    pushToast("IP blocked successfully", "success");
  };

  const confirmForceLogout = () => {
    setModal(null);
    pushToast(`${forceLogoutUser} has been logged out`, "success");
  };

  const toggleSort = (key) => {
    setSortBy((prev) => (prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }));
  };

  const openScanReport = () => {
    setReportTimestamp(new Date().toLocaleString());
    setModal("report");
  };

  const exportReportPdf = () => {
    const reportContent = [
      "Security Scan Report",
      `Timestamp: ${reportTimestamp || new Date().toLocaleString()}`,
      "Status: Medium Severity Anomalies Detected",
      "Security Health Score: 92/100",
      "Medium Alerts: 4",
      "Blocked Requests Today: 22",
      "",
      "Detected Issues:",
      "1) Suspicious login bursts detected - Medium",
      "2) Repeated failed token validation attempts - Medium",
      "3) High API request spike blocked - Low",
      "4) Unknown IP probing behavior - Medium",
      "",
      "Recommendations:",
      "- Enable stricter rate limiting",
      "- Review suspicious IP addresses",
      "- Rotate admin tokens",
      "- Continue traffic monitoring",
    ].join("\n");

    const blob = new Blob([reportContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "security-scan-report.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("Report exported", "success");
  };

  return (
    <div className="relative overflow-hidden bg-[#0B0F1A] p-5 md:p-8">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 15% 15%, rgba(59,130,246,0.18), transparent 30%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.12), transparent 30%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.08), transparent 35%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-[1400px] space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((item) => (
            <motion.div key={item.key} whileHover={{ y: -3 }} className={`rounded-2xl border border-white/10 bg-[#111827] p-4 transition-all duration-300 ${item.borderGlow}`}>
              <div className="flex items-start justify-between">
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{item.label}</p>
                <item.icon className={`h-4.5 w-4.5 ${item.iconColor}`} />
              </div>
              <p className="mt-2 text-3xl font-semibold text-[#E5E7EB]">
                <AnimatedCounter value={Number(item.value)} />
              </p>
              <p className={`mt-1 text-xs ${item.trend.startsWith("+") ? "text-[#34D399]" : "text-[#FCA5A5]"}`}>{item.trend} vs last week</p>
              <div className="mt-3 flex h-8 items-end gap-1">
                {item.spark.map((value, idx) => <div key={`${item.key}-${idx}`} className="w-full rounded-t-sm bg-[#3B82F6]/60" style={{ height: `${value}%` }} />)}
              </div>
            </motion.div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="text-xs text-[#9CA3AF]">Active Sessions: <span className="font-semibold text-[#E5E7EB]">{activeSessions}</span></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] p-3">
              <div className="flex gap-2">
                {["daily", "weekly", "monthly"].map((range) => (
                  <button key={range} onClick={() => setChartRange(range)} className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide ${chartRange === range ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "bg-[#111827] text-[#9CA3AF] hover:text-[#E5E7EB]"}`}>
                    {range}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative h-10 w-10">
                  <svg viewBox="0 0 36 36" className="h-10 w-10">
                    <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#1F2937" strokeWidth="3" />
                    <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${healthScore}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#A7F3D0]">
                    {healthScore}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Security Health Score</p>
                  <p className="text-sm font-semibold text-[#E5E7EB]">{healthScore}/100</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/10 bg-[#111827] p-5 xl:col-span-2"
          >
            <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Login Attempts Over Time</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.loginAttempts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip formatter={(value) => [`${value} attempts`, "Login Attempts"]} labelFormatter={(label) => `Time: ${label}`} contentStyle={{ background: "#0F172A", border: "1px solid #374151" }} />
                  <Line
                    type="monotone"
                    dataKey="attempts"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, stroke: "#BFDBFE", strokeWidth: 2 }}
                    isAnimationActive
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-white/10 bg-[#111827] p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Threat Distribution</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={threatDistributionData}
                      dataKey="percent"
                      innerRadius={48}
                      outerRadius={82}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive
                      animationDuration={900}
                      onMouseEnter={(_, idx) => setActiveThreatSlice(idx)}
                    >
                      {threatDistributionData.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke={idx === activeThreatSlice ? "#E5E7EB" : "transparent"}
                          strokeWidth={idx === activeThreatSlice ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, payload) => [
                        `${value}% (${payload?.payload?.count})`,
                        payload?.payload?.name,
                      ]}
                      contentStyle={{ background: "#0F172A", border: "1px solid #374151" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 pt-2">
                {threatDistributionData.map((item, idx) => (
                  <div
                    key={item.name}
                    className={`rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs ${
                      idx === activeThreatSlice ? "ring-1 ring-[#3B82F6]/60" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[#E5E7EB]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </div>
                      <span className="text-[#9CA3AF]">
                        {item.percent}% ({item.count})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-white/10 bg-[#111827] p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#E5E7EB]">
                Weekly Upload Activity vs Threat Events
              </h3>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Compare file volume and detected security incidents.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-[#BFDBFE]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                Uploads
              </span>
              <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                Threat Events
              </span>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.uploadsThreats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #374151" }} />
                <Bar dataKey="uploads" fill="#3B82F6" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={0} animationDuration={800} />
                <Bar dataKey="threats" fill="#EF4444" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={160} animationDuration={850} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">Live Threat Monitor</h3>
              <label className="flex items-center gap-2 text-xs text-[#9CA3AF]"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} />Sound</label>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {visibleAlerts.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#0F172A] p-3 text-sm text-[#9CA3AF]">No active alerts.</div>
              ) : (
                visibleAlerts.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/10 bg-[#0F172A] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-1 text-xs ${severityClass[item.severity]}`}>{item.severity}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9CA3AF]">{item.ago}</span>
                        <button className="rounded p-0.5 text-[#9CA3AF] hover:bg-white/10 hover:text-[#E5E7EB]" onClick={() => setThreatAlerts((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, dismissed: true } : entry)))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.severity === "Critical" ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#EF4444]" /> : null}
                      <p className="text-sm text-[#E5E7EB]">{item.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search logs..." className="w-full rounded-xl border border-white/10 bg-[#0F172A] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/60" />
              </div>
              <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-[#E5E7EB]">
                <option value="all">All Results</option>
                <option value="success">Success</option>
                <option value="blocked">Blocked</option>
                <option value="denied">Denied</option>
              </select>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase text-[#9CA3AF]">
                    {["time", "user", "email", "ip", "action", "result"].map((head) => (
                      <th key={head} className="px-3 py-2">
                        <button className="text-left hover:text-[#E5E7EB]" onClick={() => toggleSort(head)}>{head === "ip" ? "IP Address" : head}</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`sk-${idx}`}><td colSpan={6} className="px-3 py-3"><div className="h-8 animate-pulse rounded-lg bg-white/5" /></td></tr>
                    ))
                  ) : pagedLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-[#9CA3AF]">No logs match this filter.</td></tr>
                  ) : (
                    pagedLogs.map((row, idx) => (
                      <tr key={`${row.ip}-${idx}`} className="cursor-pointer border-b border-white/5 text-sm text-[#E5E7EB] hover:bg-white/5" onClick={() => setSelectedLog(row)}>
                        <td className="px-3 py-3">{row.time}</td>
                        <td className="px-3 py-3">{row.user}</td>
                        <td className="px-3 py-3">{row.email}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#9CA3AF]">{row.ip}</span>
                            <button className="rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-[#E5E7EB]" onClick={(event) => { event.stopPropagation(); navigator.clipboard.writeText(row.ip); pushToast(`Copied ${row.ip}`, "info"); }}>
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">{row.action}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${row.result === "Success" ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#EF4444]/20 text-[#FCA5A5]"}`}>{row.result}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">Page {page} of {pageCount}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#E5E7EB] disabled:opacity-40">Prev</button>
                <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#E5E7EB] disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <button onClick={() => setModal("block")} className="rounded-xl bg-[#7F1D1D] px-4 py-2.5 text-sm font-medium text-[#FCA5A5] transition duration-200 hover:-translate-y-0.5 hover:opacity-90">Block IP</button>
            <button onClick={() => setModal("export")} className="rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-[#BFDBFE] transition duration-200 hover:-translate-y-0.5 hover:opacity-90">Export Logs</button>
            <button onClick={() => setModal("logout")} className="rounded-xl bg-[#312E81] px-4 py-2.5 text-sm font-medium text-[#C4B5FD] transition duration-200 hover:-translate-y-0.5 hover:opacity-90">Force Logout User</button>
            <button onClick={() => setModal("scan")} className="rounded-xl bg-[#064E3B] px-4 py-2.5 text-sm font-medium text-[#6EE7B7] transition duration-200 hover:-translate-y-0.5 hover:opacity-90">Security Scan</button>
            <button onClick={() => setModal("refresh")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F2937] px-4 py-2.5 text-sm font-medium text-[#E5E7EB] transition hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Data
            </button>
          </div>
          {(scanState.running || scanState.result) ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0F172A] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>Enterprise Security Scan</span>
                <span>{scanState.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#10B981] transition-all duration-300" style={{ width: `${scanState.progress}%` }} />
              </div>
              <div className="mt-3 space-y-1.5">
                {scanStages.map((stage, idx) => {
                  const currentIdx = Math.min(
                    scanStages.length - 1,
                    Math.floor((scanState.progress / 100) * scanStages.length)
                  );
                  const complete = idx < currentIdx;
                  const active = idx === currentIdx && scanState.running;
                  return (
                    <div key={stage} className="flex items-center gap-2 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          complete
                            ? "bg-[#10B981]"
                            : active
                              ? "animate-pulse bg-[#3B82F6]"
                              : "bg-white/20"
                        }`}
                      />
                      <span className={complete ? "text-[#A7F3D0]" : active ? "text-[#BFDBFE]" : "text-[#9CA3AF]"}>
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
              {scanState.result ? (
                <div className="mt-4 rounded-xl border border-[#10B981]/20 bg-[#064E3B]/20 p-3">
                  <p className={`flex items-center gap-2 text-sm ${scanState.threatDetected ? "text-[#FCD34D]" : "text-[#6EE7B7]"}`}>
                    {scanState.threatDetected ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    {scanState.result}
                  </p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Medium alerts: {scanState.mediumAlerts}</p>
                  <p className="text-xs text-[#9CA3AF]">Blocked requests today: {scanState.blockedToday}</p>
                  <button onClick={openScanReport} className="mt-3 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-1.5 text-xs text-[#BFDBFE] hover:bg-[#3B82F6]/20">
                    View Report
                  </button>
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2">
                    <div className="relative h-12 w-12">
                      <svg viewBox="0 0 36 36" className="h-12 w-12">
                        <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#1F2937" strokeWidth="3" />
                        <path
                          d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3"
                          strokeDasharray="92, 100"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#A7F3D0]">
                        92
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[#9CA3AF]">Security Health Score</p>
                      <p className="text-sm font-semibold text-[#E5E7EB]">92/100</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {modal === "block" ? (
        <Modal title="Block IP Address" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input value={blockIpInput} onChange={(event) => setBlockIpInput(event.target.value)} placeholder="e.g. 203.11.2.90" className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/60" />
            <button onClick={confirmBlockIp} className="w-full rounded-xl bg-[#B91C1C] px-4 py-2.5 text-sm font-medium text-[#FCA5A5] hover:bg-[#991B1B]">Confirm Block</button>
          </div>
        </Modal>
      ) : null}

      {modal === "logout" ? (
        <Modal title="Force Logout User" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <select value={forceLogoutUser} onChange={(event) => setForceLogoutUser(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white">
              {adminUsers.map((user) => <option key={user} value={user}>{user}</option>)}
            </select>
            <button onClick={confirmForceLogout} className="w-full rounded-xl bg-[#312E81] px-4 py-2.5 text-sm font-medium text-[#DDD6FE] hover:bg-[#4338CA]">Confirm Force Logout</button>
          </div>
        </Modal>
      ) : null}

      {modal === "export" ? (
        <Modal title="Export Logs" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">Download current filtered log entries as CSV.</p>
            <button
              onClick={() => {
                exportLogs();
                setModal(null);
              }}
              className="w-full rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-[#BFDBFE] hover:bg-[#1E40AF]"
            >
              Confirm Export
            </button>
          </div>
        </Modal>
      ) : null}

      {modal === "scan" ? (
        <Modal title="Run Security Scan" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              This scan evaluates sessions, traffic patterns, token abuse, and upload integrity.
            </p>
            <button
              onClick={() => {
                runSecurityScan();
                setModal(null);
              }}
              className="w-full rounded-xl bg-[#064E3B] px-4 py-2.5 text-sm font-medium text-[#6EE7B7] hover:bg-[#065F46]"
            >
              Start Scan
            </button>
          </div>
        </Modal>
      ) : null}

      {modal === "refresh" ? (
        <Modal title="Refresh Dashboard Data" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              Reload KPI metrics, charts, alerts, and logs with latest simulated telemetry.
            </p>
            <button
              onClick={() => {
                triggerRefresh();
                setModal(null);
              }}
              className="w-full rounded-xl bg-[#1F2937] px-4 py-2.5 text-sm font-medium text-[#E5E7EB] hover:bg-[#374151]"
            >
              Confirm Refresh
            </button>
          </div>
        </Modal>
      ) : null}

      {selectedLog ? (
        <Modal title="Log Details" onClose={() => setSelectedLog(null)}>
          <div className="space-y-2 text-sm text-[#E5E7EB]">
            <p><span className="text-[#9CA3AF]">Time:</span> {selectedLog.time}</p>
            <p><span className="text-[#9CA3AF]">User:</span> {selectedLog.user}</p>
            <p><span className="text-[#9CA3AF]">Email:</span> {selectedLog.email}</p>
            <p><span className="text-[#9CA3AF]">IP:</span> {selectedLog.ip}</p>
            <p><span className="text-[#9CA3AF]">Action:</span> {selectedLog.action}</p>
            <p><span className="text-[#9CA3AF]">Result:</span> {selectedLog.result}</p>
          </div>
        </Modal>
      ) : null}

      <ReportDrawer
        open={modal === "report"}
        onClose={() => setModal(null)}
        onExportPdf={exportReportPdf}
        onRerunScan={() => {
          setModal(null);
          runSecurityScan();
        }}
        reportTimestamp={reportTimestamp}
      />

      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] space-y-2">
        {toasts.map((toast) => (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`pointer-events-auto rounded-xl border px-4 py-2 text-sm shadow-xl ${toast.tone === "success" ? "border-[#10B981]/30 bg-[#064E3B]/85 text-[#D1FAE5]" : "border-[#3B82F6]/30 bg-[#1E3A8A]/80 text-[#DBEAFE]"}`}>
            <span className="inline-flex items-center gap-2">
              {toast.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {toast.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
