import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  Clock3,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import UserWorkspacePanel from "@/components/workspace/UserWorkspacePanel";

/* ─── search helpers ─────────────────────────────────────────────── */

const SEARCH_POOL = [
  { label: "admin@test.com",                     category: "User",    path: "/admin/users" },
  { label: "user@test.com",                      category: "User",    path: "/user/profile" },
  { label: "185.23.11.92",                       category: "IP",      path: "/admin/logs" },
  { label: "192.168.4.20",                       category: "IP",      path: "/admin/logs" },
  { label: "Credential stuffing blocked",        category: "Threat",  path: "/user/security" },
  { label: "Brute force attempt detected",       category: "Threat",  path: "/user/security" },
  { label: "Vault replication completed",        category: "Event",   path: "/user/files" },
  { label: "Forensic hash verified",             category: "Event",   path: "/user/files" },
  { label: "Session terminated by SOC policy",  category: "Session", path: "/user/profile" },
  { label: "AES-256 integrity check passed",    category: "Log",     path: "/user/security" },
];

const CATEGORY_ICONS = {
  User:    "👤",
  IP:      "🌐",
  Threat:  "🔴",
  Event:   "⚡",
  Session: "🔒",
  Log:     "📋",
};

/* ─── notification helpers ───────────────────────────────────────── */

const LEVEL_DOT = {
  critical: "bg-rose-400",
  high:     "bg-orange-400",
  medium:   "bg-sky-400",
  info:     "bg-emerald-400",
};

const LIVE_EVENTS = [
  { section: "Critical Alerts",  title: "Privilege escalation blocked",      description: "Policy engine denied suspicious role mutation.", level: "critical" },
  { section: "Security Events",  title: "Session control updated",           description: "Force-logout executed for risky device session.", level: "medium" },
  { section: "System Updates",   title: "Threat signatures synchronized",    description: "Latest detection package deployed to all relay nodes.", level: "info" },
  { section: "Critical Alerts",  title: "Anomalous upload pattern detected", description: "Entropy deviation exceeded SOC threshold — quarantined.", level: "critical" },
];

const INITIAL_NOTIFS = [
  { id: 1, section: "Critical Alerts",  title: "Credential stuffing blocked",    description: "WAF policy blocked repeated auth abuse attempt.", level: "critical", ago: "1m",  unread: true  },
  { id: 2, section: "Critical Alerts",  title: "JWT replay quarantined",         description: "Token integrity check detected replay attempt.",  level: "critical", ago: "4m",  unread: true  },
  { id: 3, section: "Security Events",  title: "Admin session authenticated",    description: "Administrator login from trusted network range.",  level: "medium",   ago: "11m", unread: true  },
  { id: 4, section: "Security Events",  title: "User access revoked",            description: "Session terminated after risk policy trigger.",   level: "high",     ago: "18m", unread: false },
  { id: 5, section: "System Updates",   title: "Vault backup completed",         description: "Nightly encrypted backup finished successfully.", level: "info",     ago: "36m", unread: false },
  { id: 6, section: "System Updates",   title: "Audit log exported",             description: "Package exported to secure evidence archive.",    level: "info",     ago: "52m", unread: false },
];

/* ─── initials helper ────────────────────────────────────────────── */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ─── topbar ─────────────────────────────────────────────────────── */

export default function AppTopbar({ title, onMenuClick, forceDark = false }) {
  const { user, role } = useAuth();
  const { isLight: contextLight } = useWorkspaceControl();
  const isLight = forceDark ? false : contextLight;
  const navigate = useNavigate();

  const [time, setTime] = useState(() => new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* search */
  const [searchRaw, setSearchRaw] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  /* notifications */
  const liveTickRef = useRef(0);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);

  const topbarRef = useRef(null);

  /* ── clock ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  /* ── live notification feed ────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => {
      const ev = LIVE_EVENTS[liveTickRef.current % LIVE_EVENTS.length];
      liveTickRef.current += 1;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setNotifs((prev) => [{ id: Date.now(), ...ev, ago: ts, unread: true }, ...prev].slice(0, 20));
    }, 14_000);
    return () => window.clearInterval(id);
  }, []);

  /* ── debounced search ──────────────────────────────────────────── */
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchRaw(val);
    setSearchOpen(true);
    setActiveSearchIndex(0);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => setSearchQuery(val), 300);
  }, []);

  useEffect(() => () => { if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current); }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return SEARCH_POOL.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 7);
  }, [searchQuery]);

  /* ── stable onClose for profile panel ─────────────────────────── */
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  /* ── click-outside + ESC close ──────────────────────────────────── */
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!topbarRef.current?.contains(e.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /* ── derived ───────────────────────────────────────────────────── */
  const unreadCount = useMemo(() => notifs.filter((n) => n.unread).length, [notifs]);

  const markAllRead = useCallback(() => setNotifs((prev) => prev.map((n) => ({ ...n, unread: false }))), []);
  const dismissNotif = useCallback((id) => setNotifs((prev) => prev.filter((n) => n.id !== id)), []);
  const clearAllNotifs = useCallback(() => setNotifs([]), []);

  /* ── style helpers ─────────────────────────────────────────────── */
  /* Fully solid backgrounds — no transparency leak */
  const dropdownClass = isLight
    ? "border-[#dbe4ee] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
    : "border-[#1e293b] bg-[#0f172a] shadow-[0_24px_60px_rgba(0,0,0,0.65)]";

  const textPrimary = isLight ? "text-slate-900" : "text-white";
  const textMuted = isLight ? "text-slate-500" : "text-slate-500";
  const mutedHover = isLight ? "hover:text-slate-800" : "hover:text-white";
  const inputClass = isLight
    ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
    : "border-white/10 bg-white/[0.06] text-white placeholder:text-slate-600 focus:bg-white/[0.09]";

  const clockClass = isLight
    ? "border-slate-200 bg-slate-50 text-slate-600"
    : "border-white/[0.08] bg-white/[0.04] text-slate-500";

  const iconBtnClass = isLight
    ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    : "border-white/10 text-slate-500 hover:bg-white/[0.08] hover:text-white";

  return (
    <header
      ref={topbarRef}
      className={`workspace-topbar fixed left-0 right-0 top-0 z-40 h-[72px] border-b backdrop-blur-xl lg:left-64 ${isLight ? "border-slate-200 bg-white/90 shadow-[0_1px_20px_rgba(15,23,42,0.06)]" : "border-white/[0.08] bg-[#070e1c]/95 shadow-[0_4px_30px_rgba(0,0,0,0.2)]"}`}
    >
      <div className="relative flex h-full items-center gap-4 px-4 md:px-6">
        {/* ── LEFT: menu + page title ─────────────────────────── */}
        <div className="flex w-1/4 min-w-0 items-center gap-3">
          <button
            type="button"
            className={`shrink-0 rounded-lg p-2 transition lg:hidden ${isLight ? "text-slate-500 hover:bg-slate-100" : "text-slate-500 hover:bg-white/10 hover:text-white"}`}
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className={`truncate text-[15px] font-semibold ${textPrimary}`}>{title}</h1>
        </div>

        {/* ── CENTER: global search ───────────────────────────── */}
        <div className="relative hidden flex-1 max-w-md mx-auto md:block">
          <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${textMuted}`} />
          <input
            ref={searchInputRef}
            value={searchRaw}
            onFocus={() => setSearchOpen(true)}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (!searchResults.length) {
                if (e.key === "Escape") { setSearchOpen(false); searchInputRef.current?.blur(); }
                return;
              }
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveSearchIndex((p) => (p + 1) % searchResults.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSearchIndex((p) => (p - 1 + searchResults.length) % searchResults.length); }
              else if (e.key === "Enter") { e.preventDefault(); navigate(searchResults[activeSearchIndex].path); setSearchRaw(""); setSearchOpen(false); }
              else if (e.key === "Escape") { setSearchOpen(false); searchInputRef.current?.blur(); }
            }}
            placeholder="Search files, threats, sessions, logs…"
            className={`w-full rounded-xl border py-2 pl-9 pr-9 text-sm outline-none transition-all focus:ring-2 focus:ring-sky-500/30 ${inputClass}`}
          />
          {searchRaw && (
            <button type="button" className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-white`} onClick={() => { setSearchRaw(""); setSearchQuery(""); }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <AnimatePresence>
            {searchOpen && (searchResults.length > 0 || searchQuery.trim()) ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                className={`absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border p-1.5 ${dropdownClass}`}
              >
                {searchResults.length ? (
                  <>
                    <p className={`px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${textMuted}`}>Results</p>
                    {searchResults.map((item, idx) => (
                      <button
                        key={`${item.category}-${item.label}`}
                        onClick={() => { navigate(item.path); setSearchRaw(""); setSearchQuery(""); setSearchOpen(false); }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${activeSearchIndex === idx ? (isLight ? "bg-sky-50 text-sky-800" : "bg-sky-500/10 text-sky-200") : (isLight ? "text-slate-700 hover:bg-slate-50" : "text-slate-300 hover:bg-white/[0.05]")}`}
                      >
                        <span className="text-[14px]">{CATEGORY_ICONS[item.category] ?? "○"}</span>
                        <span className="flex-1">{item.label}</span>
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>{item.category}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className={`px-3 py-3 text-sm ${textMuted}`}>No results for &ldquo;{searchQuery}&rdquo;</p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: clock + notifications + profile ──────────── */}
        <div className="flex w-1/4 items-center justify-end gap-2">
          {/* WS status indicator — admin only */}
          {forceDark && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 lg:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              WS
            </div>
          )}

          {/* clock */}
          <div className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-mono lg:flex ${clockClass}`}>
            <Clock3 className="h-3.5 w-3.5 text-sky-400" />
            {time.toLocaleTimeString("en-GB", { hour12: false })}
          </div>

          {/* notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
              className={`relative rounded-xl border p-2 transition ${iconBtnClass}`}
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className={`absolute right-0 z-50 mt-2 w-[400px] overflow-hidden rounded-2xl border ${dropdownClass}`}
                >
                  {/* header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? "border-slate-100" : "border-white/[0.07]"}`}>
                    <div className="flex items-center gap-2">
                      <p className={`text-[15px] font-semibold ${textPrimary}`}>Notifications</p>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">{unreadCount} new</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={markAllRead} className="text-[12px] text-sky-400 hover:text-sky-300">Mark all read</button>
                      <button onClick={clearAllNotifs} className={`text-[12px] ${textMuted} ${mutedHover}`}>Clear all</button>
                    </div>
                  </div>

                  {/* list */}
                  <div className="max-h-[440px] overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10">
                        <ShieldCheck className="h-8 w-8 text-slate-700" />
                        <p className={`text-sm ${textMuted}`}>All caught up</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {notifs.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                            className={`group flex gap-3 rounded-xl px-3 py-2.5 transition ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.04]"}`}
                          >
                            <div className="mt-1.5 shrink-0">
                              <span className={`block h-2 w-2 rounded-full ${LEVEL_DOT[item.level] ?? "bg-slate-500"}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-[13px] font-semibold leading-snug ${item.unread ? textPrimary : textMuted}`}>{item.title}</p>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                                  <span className={`text-[11px] ${textMuted}`}>{item.ago}</span>
                                </div>
                              </div>
                              <p className={`mt-0.5 text-[12px] ${textMuted}`}>{String(item.description)}</p>
                              <div className="mt-1.5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => { navigate(role === "admin" ? "/admin/logs" : "/user/security"); setNotifOpen(false); }}
                                  className="text-[11px] text-sky-400 hover:text-sky-300"
                                >
                                  View →
                                </button>
                                <button type="button" onClick={() => dismissNotif(item.id)} className={`text-[11px] ${textMuted} ${mutedHover}`}>
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* footer */}
                  <div className={`border-t px-4 py-2.5 ${isLight ? "border-slate-100" : "border-white/[0.07]"}`}>
                    <button
                      type="button"
                      onClick={() => { navigate(role === "admin" ? "/admin/logs" : "/user/security"); setNotifOpen(false); }}
                      className="text-[12px] font-semibold text-sky-400 hover:text-sky-300"
                    >
                      Open notification center →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false); }}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${isLight ? "border-slate-200 bg-white hover:bg-slate-50" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"}`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${isLight ? "bg-blue-100 text-blue-700" : "bg-[#1e3a8a]/40 text-sky-200"}`}>
                {getInitials(user?.fullName || user?.name || "")}
              </span>
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <p className={`text-[13px] font-semibold leading-tight ${textPrimary}`}>{user?.fullName || "Operator"}</p>
                  {role === "admin" && (
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className={`text-[11px] ${textMuted}`}>{user?.email}</p>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""} ${textMuted}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <UserWorkspacePanel user={user} role={role} onClose={closeProfile} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
