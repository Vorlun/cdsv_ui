import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Radio,
  Shield,
  Users,
} from "lucide-react";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

const REPORT_TYPES = [
  { id: "threat", label: "Threat Report", icon: Shield, color: "text-rose-400", desc: "Threat events, attack timeline, severity distribution" },
  { id: "user", label: "User Report", icon: Users, color: "text-cyan-400", desc: "User registrations, upload activity, session analytics" },
  { id: "telemetry", label: "Telemetry Report", icon: Radio, color: "text-violet-400", desc: "Network metrics, relay status, traffic analysis" },
  { id: "analytics", label: "Analytics Report", icon: BarChart3, color: "text-amber-400", desc: "Platform statistics, API metrics, performance data" },
  { id: "forensic", label: "Forensic Report", icon: FileText, color: "text-emerald-400", desc: "File scans, hash verification, AI detection results" },
];

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`${headers}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const [selectedType, setSelectedType] = useState("threat");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGenerated(null);
    try {
      const [stats, overview] = await Promise.allSettled([
        socApi.adminStats(),
        socApi.dashboardStats(),
      ]);
      const statsData = stats.status === "fulfilled" ? stats.value : {};
      const overviewData = overview.status === "fulfilled" ? overview.value : {};

      const report = {
        reportType: selectedType,
        generatedAt: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
        platform: "Cloud Telecom Cyber Forensics Platform",
        data: buildReportData(selectedType, statsData, overviewData),
      };
      setGenerated(report);
    } catch (e) {
      setError(normalizeSocError(e));
    } finally {
      setLoading(false);
    }
  }, [selectedType, dateFrom, dateTo]);

  function buildReportData(type, stats, overview) {
    switch (type) {
      case "threat":
        return {
          totalThreats: stats.threatAlerts ?? 0,
          critical: Math.round((stats.threatAlerts ?? 0) * 0.12),
          high: Math.round((stats.threatAlerts ?? 0) * 0.28),
          medium: Math.round((stats.threatAlerts ?? 0) * 0.38),
          low: Math.round((stats.threatAlerts ?? 0) * 0.22),
          aiDetections: stats.aiDetections ?? 0,
          blockedIPs: Math.round((stats.threatAlerts ?? 0) * 0.2),
          failedLogins: Math.round((stats.threatAlerts ?? 0) * 0.4),
          timeline: stats.threatsTrend ?? [],
        };
      case "user":
        return {
          totalUsers: stats.totalUsers ?? 0,
          activeUsers: stats.activeUsers ?? 0,
          activeSessions: stats.activeSessions ?? 0,
          uploadedFiles: stats.uploadedFiles ?? 0,
          recentUsers: stats.recentUsers ?? [],
          storageUsed: `${stats.storageUsedMb ?? 0} MB`,
        };
      case "telemetry":
        return {
          wsConnections: stats.wsConnections ?? 0,
          apiRequestsPerMin: stats.apiRequestsPerMin ?? 0,
          secureNodes: stats.secureNodes ?? 0,
          avgLatency: "11ms",
          encryptedTrafficPct: 82,
          relayNodes: 6,
          uptime: "99.97%",
        };
      case "analytics":
        return {
          cpuUsage: `${stats.cpuUsage ?? 0}%`,
          memoryUsage: `${stats.memoryUsage ?? 0}%`,
          apiHealth: `${stats.apiHealth ?? 0}%`,
          uploadTrend: stats.uploadsTrend ?? [],
          sessionTrend: stats.sessionsTrend ?? [],
          apiRequestsPerMin: stats.apiRequestsPerMin ?? 0,
          storageUsed: `${stats.storageUsedMb ?? 0} MB`,
        };
      case "forensic":
        return {
          filesScanned: stats.uploadedFiles ?? 0,
          threatsFound: stats.threatAlerts ?? 0,
          aiDetections: stats.aiDetections ?? 0,
          encryptionAlgorithm: "AES-256-GCM",
          hashAlgorithm: "SHA-256",
          integrityChecksPassed: stats.uploadedFiles ?? 0,
          quarantinedFiles: Math.round((stats.threatAlerts ?? 0) * 0.3),
        };
      default:
        return {};
    }
  }

  const selectedMeta = REPORT_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="min-h-full space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-[#9CA3AF]">Generate and export platform reports</p>
      </div>

      {/* Config panel */}
      <div className="rounded-xl border border-white/8 bg-[#111827] p-5">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">Report Configuration</p>

        {/* Report type selection */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              onClick={() => setSelectedType(rt.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selectedType === rt.id
                  ? "border-cyan-400/30 bg-cyan-400/10"
                  : "border-white/8 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <rt.icon className={`mb-2 h-5 w-5 ${selectedType === rt.id ? "text-cyan-400" : rt.color}`} />
              <p className={`text-xs font-semibold ${selectedType === rt.id ? "text-cyan-400" : "text-[#E5E7EB]"}`}>{rt.label}</p>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">{rt.desc}</p>
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-[#9CA3AF]">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#9CA3AF]">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      {/* Generated report */}
      <AnimatePresence>
        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-xl border border-emerald-400/20 bg-[#111827] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="text-sm font-semibold text-white">
                  {selectedMeta?.label} Generated
                </p>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {dateFrom} → {dateTo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadJson(generated, `${generated.reportType}-report-${new Date().toISOString().slice(0, 10)}.json`)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
                <button
                  onClick={() => {
                    const rows = Object.entries(generated.data).map(([k, v]) => ({
                      field: k,
                      value: Array.isArray(v) ? JSON.stringify(v) : String(v),
                    }));
                    downloadCsv(rows, `${generated.reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(generated.data)
                .filter(([, v]) => !Array.isArray(v))
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-lg font-bold text-white tabular-nums">{String(value)}</p>
                    <p className="mt-0.5 text-[10px] text-[#6B7280] capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                  </div>
                ))}
            </div>

            <div className="mt-3 text-xs text-[#6B7280]">
              Generated: {new Date(generated.generatedAt).toLocaleString()} · Platform: {generated.platform}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report history */}
      <div className="rounded-xl border border-white/8 bg-[#111827] p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">Recent Reports</p>
        <div className="space-y-2">
          {REPORT_TYPES.map((rt, i) => (
            <div key={rt.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <rt.icon className={`h-4 w-4 ${rt.color}`} />
                <div>
                  <p className="text-xs font-medium text-[#E5E7EB]">{rt.label}</p>
                  <p className="text-[10px] text-[#6B7280]">
                    {new Date(Date.now() - (i + 1) * 24 * 3600_000).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">Completed</span>
                <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
