import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Info,
  Shield,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "threat", severity: "critical", title: "Critical Threat Detected", body: "Entropy anomaly in file upload — quarantine initiated. SHA-256: a4f2...8c1d", time: new Date(Date.now() - 2 * 60_000), read: false },
  { id: 2, type: "security", severity: "high", title: "Multiple Failed Login Attempts", body: "5 failed auth attempts from IP 192.168.1.44 in the last 10 minutes.", time: new Date(Date.now() - 8 * 60_000), read: false },
  { id: 3, type: "upload", severity: "medium", title: "Suspicious File Upload", body: "File 'document.pdf.exe' flagged by heuristic scanner — double extension attack pattern.", time: new Date(Date.now() - 15 * 60_000), read: false },
  { id: 4, type: "user", severity: "info", title: "New User Registered", body: "analyst@telecom.uz registered and awaiting activation.", time: new Date(Date.now() - 32 * 60_000), read: true },
  { id: 5, type: "system", severity: "info", title: "Relay Synchronization Complete", body: "6/6 FTTH relay nodes synchronized successfully. Avg latency: 11ms.", time: new Date(Date.now() - 45 * 60_000), read: true },
  { id: 6, type: "security", severity: "low", title: "JWT Token Expiry Warning", body: "3 sessions approaching token expiry threshold. Refresh required.", time: new Date(Date.now() - 60 * 60_000), read: true },
  { id: 7, type: "upload", severity: "info", title: "Forensic Scan Complete", body: "Batch of 8 files analyzed. Integrity: 100%. Threats: 0.", time: new Date(Date.now() - 2 * 3600_000), read: true },
  { id: 8, type: "threat", severity: "high", title: "Intrusion Attempt Blocked", body: "SQL injection pattern detected and blocked at API gateway. Source: 10.0.0.55.", time: new Date(Date.now() - 3 * 3600_000), read: true },
];

const TYPE_ICONS = {
  threat: ShieldAlert,
  security: Shield,
  upload: Upload,
  user: Users,
  system: Info,
};

const SEV_COLORS = {
  critical: "bg-rose-400/10 border-rose-400/20 text-rose-400",
  high: "bg-orange-400/10 border-orange-400/20 text-orange-400",
  medium: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  low: "bg-cyan-400/10 border-cyan-400/20 text-cyan-400",
  info: "bg-slate-400/10 border-slate-400/20 text-slate-400",
};

const SEV_DOT = {
  critical: "bg-rose-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-cyan-400",
  info: "bg-slate-400",
};

function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const filters = ["all", "threat", "security", "upload", "user", "system"];
  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="min-h-full space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-[#9CA3AF]">Security alerts · System events · Platform notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {["critical", "high", "medium", "low", "info"].map((sev) => {
          const count = notifications.filter((n) => n.severity === sev).length;
          return (
            <div key={sev} className={`rounded-xl border p-3 text-center ${SEV_COLORS[sev]}`}>
              <p className="text-xl font-bold tabular-nums">{count}</p>
              <p className="text-xs capitalize">{sev}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                : "bg-white/5 text-[#9CA3AF] border border-white/8 hover:text-white"
            }`}
          >
            {f}
            {f !== "all" && (
              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                {notifications.filter((n) => n.type === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111827] py-16 text-center"
            >
              <Bell className="mb-3 h-8 w-8 text-[#374151]" />
              <p className="text-sm text-[#6B7280]">No notifications</p>
            </motion.div>
          )}
          {filtered.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Info;
            return (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                className={`group relative flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                  notif.read
                    ? "border-white/5 bg-[#111827]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
                onClick={() => markRead(notif.id)}
              >
                {!notif.read && (
                  <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${SEV_DOT[notif.severity]}`} />
                )}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${SEV_COLORS[notif.severity]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notif.read ? "text-[#9CA3AF]" : "text-white"}`}>{notif.title}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase ${SEV_COLORS[notif.severity]}`}>
                      {notif.severity}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${notif.read ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{notif.body}</p>
                  <p className="mt-1 text-[10px] text-[#6B7280]">{timeAgo(notif.time)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                  className="ml-1 mt-0.5 shrink-0 rounded p-1 text-[#6B7280] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
