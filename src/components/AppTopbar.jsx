import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Clock3,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Settings2,
  Database,
  Moon,
  Sun,
  Lock,
  UserCircle2,
  KeyRound,
  ActivitySquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

export default function AppTopbar({ title, onMenuClick }) {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(() => new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [themeMode, setThemeMode] = useState("dark");
  const [notifSectionsOpen, setNotifSectionsOpen] = useState({
    critical: true,
    security: true,
    system: true,
  });
  const topbarRef = useRef(null);
  const [notifs, setNotifs] = useState([
    {
      id: 1,
      section: "Critical Alerts",
      title: "Credential stuffing blocked",
      description: "Automated WAF policy blocked repeated credential abuse.",
      level: "critical",
      ago: "1m ago",
      unread: true,
    },
    {
      id: 2,
      section: "Critical Alerts",
      title: "Brute force detected",
      description: "Threshold exceeded on auth endpoint for admin account.",
      level: "high",
      ago: "3m ago",
      unread: true,
    },
    {
      id: 3,
      section: "Critical Alerts",
      title: "Suspicious token abuse",
      description: "JWT replay attempt quarantined by token integrity check.",
      level: "critical",
      ago: "6m ago",
      unread: true,
    },
    {
      id: 4,
      section: "Security Events",
      title: "New admin login",
      description: "Administrator authenticated from trusted location.",
      level: "medium",
      ago: "11m ago",
      unread: true,
    },
    {
      id: 5,
      section: "Security Events",
      title: "User suspended",
      description: "Access revoked after risk policy trigger.",
      level: "high",
      ago: "17m ago",
      unread: false,
    },
    {
      id: 6,
      section: "Security Events",
      title: "Settings changed",
      description: "Session timeout policy updated to 30 minutes.",
      level: "medium",
      ago: "22m ago",
      unread: false,
    },
    {
      id: 7,
      section: "System Updates",
      title: "Backup completed",
      description: "Nightly encrypted backup completed successfully.",
      level: "info",
      ago: "36m ago",
      unread: false,
    },
    {
      id: 8,
      section: "System Updates",
      title: "Logs exported",
      description: "Audit log package exported to secure archive.",
      level: "info",
      ago: "51m ago",
      unread: false,
    },
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const liveEvents = [
      {
        section: "Critical Alerts",
        title: "Privilege escalation attempt blocked",
        description: "Policy engine denied suspicious role mutation request.",
        level: "critical",
      },
      {
        section: "Security Events",
        title: "Session control updated",
        description: "Force logout executed for risky user session.",
        level: "medium",
      },
      {
        section: "System Updates",
        title: "Threat signatures synced",
        description: "Latest detection package deployed to all regions.",
        level: "info",
      },
    ];
    const interval = window.setInterval(() => {
      const now = new Date();
      const sample = liveEvents[Math.floor(Math.random() * liveEvents.length)];
      setNotifs((prev) => [
        {
          id: Date.now(),
          ...sample,
          ago: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          unread: true,
        },
        ...prev,
      ].slice(0, 18));
    }, 14000);
    return () => window.clearInterval(interval);
  }, []);

  const searchPool = useMemo(
    () => [
      { label: "Admin Operator", category: "User" },
      { label: "admin@test.com", category: "Email" },
      { label: "User Analyst", category: "User" },
      { label: "user@test.com", category: "Email" },
      { label: "185.23.11.92", category: "IP" },
      { label: "192.168.4.20", category: "IP" },
      { label: "Critical token abuse pattern", category: "Alert" },
      { label: "Brute force attempt blocked", category: "Alert" },
      { label: "Export action success", category: "Log" },
      { label: "Suspicious login from new country", category: "Log" },
    ],
    []
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchPool
      .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 6);
  }, [search, searchPool]);

  const unreadCount = useMemo(() => notifs.filter((item) => item.unread).length, [notifs]);
  const groupedNotifs = useMemo(
    () => ({
      critical: notifs.filter((item) => item.section === "Critical Alerts"),
      security: notifs.filter((item) => item.section === "Security Events"),
      system: notifs.filter((item) => item.section === "System Updates"),
    }),
    [notifs]
  );

  const levelClass = (level) =>
    level === "critical"
      ? "bg-[#EF4444]/20 text-[#FCA5A5]"
      : level === "high"
        ? "bg-[#F97316]/20 text-[#FDBA74]"
        : level === "medium"
          ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
          : "bg-[#10B981]/20 text-[#86EFAC]";

  const levelIcon = (level) =>
    level === "critical" ? (
      <ShieldAlert className="h-3.5 w-3.5 text-[#FCA5A5]" />
    ) : level === "high" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-[#FDBA74]" />
    ) : level === "medium" ? (
      <ActivitySquare className="h-3.5 w-3.5 text-[#BFDBFE]" />
    ) : (
      <ShieldCheck className="h-3.5 w-3.5 text-[#86EFAC]" />
    );

  useEffect(() => {
    const closeOutside = (event) => {
      if (!topbarRef.current?.contains(event.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  return (
    <header ref={topbarRef} className="fixed left-0 right-0 top-0 z-30 h-[72px] border-b border-white/15 bg-[#111827]/70 backdrop-blur-xl lg:left-64">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
                setActiveSearchIndex(0);
              }}
              onKeyDown={(event) => {
                if (!searchResults.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  setSearch(searchResults[activeSearchIndex].label);
                  setSearchOpen(false);
                }
              }}
              placeholder="Search alerts, users, logs..."
              className="w-56 rounded-xl border border-white/10 bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/60"
            />
            {searchOpen && (
              <div className="absolute left-0 right-0 z-40 mt-2 rounded-xl border border-white/10 bg-[#0F172A] p-2 shadow-2xl">
                {searchResults.length ? searchResults.map((item, idx) => (
                  <button
                    key={`${item.category}-${item.label}`}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs text-[#E5E7EB] hover:bg-white/10 ${activeSearchIndex === idx ? "bg-white/10" : ""}`}
                    onClick={() => {
                      setSearch(item.label);
                      setSearchOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-[#9CA3AF]">{item.category}</span>
                  </button>
                )) : (
                  <p className="px-2 py-3 text-xs text-[#9CA3AF]">No results found.</p>
                )}
              </div>
            )}
          </div>
          <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-xs text-[#9CA3AF] md:flex">
            <Clock3 className="h-3.5 w-3.5 text-[#60A5FA]" />
            {time.toLocaleTimeString()}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              className="relative rounded-lg border border-white/10 p-2 text-[#9CA3AF] hover:bg-white/10 hover:text-white"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 z-40 mt-2 w-[420px] rounded-2xl border border-white/10 bg-[#0F172A]/90 shadow-[0_20px_50px_rgba(2,6,23,0.5)] backdrop-blur-xl"
              >
                <div className="sticky top-0 z-10 rounded-t-2xl border-b border-white/10 bg-[#0F172A]/95 p-3 backdrop-blur">
                  <div>
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <p className="text-xs text-[#94A3B8]">Live Threat Alerts · <span className="rounded-full bg-[#EF4444]/20 px-1.5 py-0.5 text-[10px] text-[#FCA5A5]">{unreadCount}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNotifs((items) => items.map((item) => ({ ...item, unread: false })))}
                      className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD]"
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={() => {
                        navigate(role === "admin" ? "/admin/logs" : "/user/dashboard");
                        setNotifOpen(false);
                      }}
                      className="text-[11px] text-[#9CA3AF] hover:text-[#E5E7EB]"
                    >
                      Open Notification Center
                    </button>
                  </div>
                </div>

                <div className="max-h-[620px] space-y-3 overflow-y-auto px-3 py-3 pr-2">
                  {[
                    { title: "Critical Alerts", rows: groupedNotifs.critical },
                    { title: "Security Events", rows: groupedNotifs.security },
                    { title: "System Updates", rows: groupedNotifs.system },
                  ].map((group, index) => {
                    const key = index === 0 ? "critical" : index === 1 ? "security" : "system";
                    return (
                    <div key={group.title}>
                      <button
                        type="button"
                        onClick={() => setNotifSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className="mb-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left text-[11px] uppercase tracking-wide text-[#64748B] hover:bg-white/[0.06]"
                      >
                        {group.title}
                      </button>
                      {notifSectionsOpen[key] ? <div className="space-y-1.5">
                        {group.rows.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30 hover:bg-white/[0.06]"
                          >
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                {levelIcon(item.level)}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${levelClass(item.level)}`}>{item.level}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.unread ? <span className="h-2 w-2 rounded-full bg-[#60A5FA] ring-2 ring-[#60A5FA]/30" /> : null}
                                <span className="text-[10px] text-[#9CA3AF]">{item.ago}</span>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-[#E5E7EB]">{item.title}</div>
                            <div className="mt-0.5 text-[11px] text-[#9CA3AF]">{item.description}</div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(role === "admin" ? "/admin/logs" : "/user/dashboard");
                                  setNotifOpen(false);
                                }}
                                className="rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-1 text-[10px] text-[#BFDBFE] hover:bg-[#3B82F6]/20"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setNotifs((items) => items.filter((n) => n.id !== item.id))}
                                className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-[#9CA3AF] hover:bg-white/10 hover:text-[#E5E7EB]"
                              >
                                Dismiss
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div> : null}
                    </div>
                  )})}
                </div>
                <div className="sticky bottom-0 border-t border-white/10 bg-[#0F172A]/95 px-3 py-2 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(role === "admin" ? "/admin/logs" : "/user/dashboard");
                      setNotifOpen(false);
                    }}
                    className="text-xs text-[#93C5FD] hover:text-[#BFDBFE]"
                  >
                    View all notifications →
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F172A] px-2.5 py-1.5 text-left hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6]/20 text-xs font-semibold text-[#BFDBFE]">
                {(user?.fullName || "OP").slice(0, 2).toUpperCase()}
              </span>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-white">{user?.fullName || "Operator"}</p>
                <p className="text-[11px] text-[#9CA3AF]">{user?.email}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 z-40 mt-2 w-[380px] rounded-2xl border border-white/10 bg-[#0F172A]/90 p-3 shadow-[0_20px_50px_rgba(2,6,23,0.5)] backdrop-blur-xl"
                >
                  <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/15 text-base font-semibold text-[#BFDBFE]">
                        {(user?.fullName || "AO").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-white">Admin Operator</div>
                        <div className="text-xs text-[#9CA3AF]">Super Admin</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="rounded-md bg-[#0B1220] px-2 py-1 text-[#94A3B8]">Last login<br /><span className="text-[#E5E7EB]">09:41 UTC</span></div>
                      <div className="rounded-md bg-[#0B1220] px-2 py-1 text-[#94A3B8]">Region<br /><span className="text-[#E5E7EB]">EU-Central</span></div>
                      <div className="rounded-md bg-[#0B1220] px-2 py-1 text-[#94A3B8]">Security<br /><span className="text-[#6EE7B7]">98/100</span></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button type="button" onClick={() => { navigate(role === "admin" ? "/admin/users" : "/user/profile"); setProfileOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"><UserCircle2 className="h-4 w-4 text-[#93C5FD]" />My Profile</button>
                    <button type="button" onClick={() => { navigate("/admin/threats"); setProfileOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"><ShieldAlert className="h-4 w-4 text-[#FDBA74]" />Security Center</button>
                    <button type="button" onClick={() => { navigate("/admin/settings"); setProfileOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"><KeyRound className="h-4 w-4 text-[#BFDBFE]" />API Keys</button>
                    <button type="button" onClick={() => { navigate("/admin/settings"); setProfileOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"><Settings2 className="h-4 w-4 text-[#9CA3AF]" />Preferences</button>
                    <button type="button" onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]">{themeMode === "dark" ? <Moon className="h-4 w-4 text-[#93C5FD]" /> : <Sun className="h-4 w-4 text-[#FCD34D]" />}Theme Toggle</button>
                    <button type="button" onClick={() => { navigate("/admin/users"); setProfileOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"><Database className="h-4 w-4 text-[#A7F3D0]" />Sessions</button>
                  </div>

                  <div className="my-2 border-t border-white/10" />

                  <button type="button" onClick={() => setProfileOpen(false)} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#FDE68A] hover:bg-[#F59E0B]/10"><Lock className="h-4 w-4" />Lock Workspace</button>
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#FCA5A5] hover:bg-[#EF4444]/10"><LogOut className="h-4 w-4" />Logout</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
