import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  Bell,
  Command,
  FileText,
  LogOut,
  Menu,
  Radio,
  Search,
  Settings,
  Shield,
  User,
  UserCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logsData } from "../data/logsData";
import { useAuth } from "@/features/auth/context/AuthContext";

const routeTitles = {
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/security": "Security Visualizer",
  "/security-status": "Security Status",
  "/attack": "Attack Simulation",
  "/ai-analysis": "AI Analysis",
  "/logs": "Activity Logs",
  "/settings": "Settings",
  "/profile": "Profile",
  "/my-files": "My Files",
  "/profile-settings": "Profile Settings",
};

export default function TopNavbar({ role, onMenuClick }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title =
    pathname.startsWith("/logs/") ? "Log Incident" : routeTitles[pathname] ?? "CDSV";
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(window.localStorage.getItem("cdsv-recent-searches") ?? "[]");
      return Array.isArray(stored) ? stored.slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [realtimeAlerts, setRealtimeAlerts] = useState(true);
  const [newAlertId, setNewAlertId] = useState(null);
  const alertTimeoutsRef = useRef([]);
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      type: "critical",
      message: "Blocked unauthorized admin panel access attempt.",
      timestamp: "2m ago",
      read: false,
    },
    {
      id: "n2",
      type: "warning",
      message: "Anomalous sign-in from unknown location detected.",
      timestamp: "12m ago",
      read: false,
    },
    {
      id: "n3",
      type: "info",
      message: "Security scan completed with 0 critical findings.",
      timestamp: "28m ago",
      read: true,
    },
  ]);

  const searchItems = useMemo(() => {
    const users = Array.from(new Set(logsData.map(log => log.user))).map((user, idx) => ({
      id: `user-${idx}`,
      label: user,
      description: "User Profile",
      type: "user",
      path: "/logs",
      icon: UserCircle2,
    }));
    const files = Array.from(
      new Set(
        logsData
          .map(log => log.resource)
          .filter(resource => resource.includes("."))
      )
    ).map((file, idx) => ({
      id: `file-${idx}`,
      label: file,
      description: "File Event",
      type: "file",
      path: "/logs",
      icon: FileText,
    }));
    const incidents = logsData.map(log => ({
      id: `log-${log.id}`,
      label: log.action,
      description: `${log.status.toUpperCase()} · ${log.ip}`,
      type: "log",
      path: log.status === "error" ? `/logs/${log.id}` : "/logs",
      icon: log.status === "warning" ? AlertTriangle : Info,
    }));
    return [...incidents, ...users, ...files];
  }, []);

  const filteredSearchItems = useMemo(() => {
    if (!query.trim()) return [];
    const term = query.toLowerCase();
    return searchItems
      .filter(
        item =>
          item.label.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.type.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [query, searchItems]);

  const groupedSearchItems = useMemo(() => {
    const groups = {
      log: [],
      user: [],
      file: [],
    };
    filteredSearchItems.forEach(item => {
      groups[item.type]?.push(item);
    });
    return groups;
  }, [filteredSearchItems]);

  const unreadCount = notifications.filter(item => !item.read).length;

  useEffect(() => {
    const onKeydown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen(prev => !prev);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
      if (event.key === "Escape") {
        setIsPaletteOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    if (!realtimeAlerts) return undefined;
    const interval = window.setInterval(() => {
      const id = `n${Date.now()}`;
      const generated = {
        id,
        type: Math.random() > 0.6 ? "warning" : "info",
        message:
          Math.random() > 0.6
            ? "Suspicious request volume detected on API gateway."
            : "Log ingestion pipeline synced successfully.",
        timestamp: "now",
        read: false,
      };
      setNotifications(prev => [generated, ...prev].slice(0, 8));
      setNewAlertId(id);
      const timeoutId = window.setTimeout(
        () => setNewAlertId(current => (current === id ? null : current)),
        2200
      );
      alertTimeoutsRef.current.push(timeoutId);
    }, 18000);
    return () => window.clearInterval(interval);
  }, [realtimeAlerts]);

  useEffect(() => {
    return () => {
      alertTimeoutsRef.current.forEach(id => window.clearTimeout(id));
      alertTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= filteredSearchItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filteredSearchItems.length]);

  const closePopovers = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  };

  const runSearchAction = item => {
    if (!item) return;
    navigate(item.path);
    const updatedRecent = [item.label, ...recentSearches.filter(entry => entry !== item.label)].slice(0, 5);
    setRecentSearches(updatedRecent);
    window.localStorage.setItem("cdsv-recent-searches", JSON.stringify(updatedRecent));
    setIsPaletteOpen(false);
    setQuery("");
  };

  const highlightMatch = text => {
    const term = query.trim();
    if (!term) return text;
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <span className="rounded bg-[#3B82F6]/30 px-0.5 text-[#DBEAFE]">
          {text.slice(index, index + term.length)}
        </span>
        {text.slice(index + term.length)}
      </>
    );
  };

  const renderGroup = (titleText, items, offset = 0) => {
    if (!items.length) return null;
    return (
      <div>
        <p className="mb-1 px-2 text-[11px] uppercase tracking-wide text-[#9CA3AF]">{titleText}</p>
        {items.map((item, index) => {
          const Icon = item.icon;
          const itemIndex = offset + index;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => runSearchAction(item)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                activeIndex === itemIndex ? "bg-[#3B82F6]/20" : "hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 text-[#93C5FD]" />
              <div>
                <p className="text-sm text-[#E5E7EB]">{highlightMatch(item.label)}</p>
                <p className="text-xs text-[#9CA3AF]">{highlightMatch(item.description)}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/15 bg-[#111827]/55 shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:left-60">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open search command palette"
            onClick={() => {
              setIsPaletteOpen(true);
              closePopovers();
            }}
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#9CA3AF] transition hover:border-[#3B82F6]/50 hover:text-white md:flex"
          >
            <Search className="h-4 w-4 text-[#9CA3AF]" />
            <span className="w-40 text-left lg:w-56">Search logs, users, files</span>
            <kbd className="rounded-md border border-white/20 px-1.5 py-0.5 text-xs text-[#D1D5DB]">Ctrl K</kbd>
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Open notifications"
              onClick={() => {
                setNotificationsOpen(prev => !prev);
                setProfileOpen(false);
                setIsPaletteOpen(false);
              }}
              className="relative rounded-lg p-2 text-[#9CA3AF] transition hover:bg-white/10 hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0F172A]/95 p-3 shadow-2xl backdrop-blur"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications(items =>
                          items.map(item => ({ ...item, read: true }))
                        )
                      }
                      className="text-xs text-[#60A5FA] hover:text-[#93C5FD]"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {notifications.map(item => (
                      <motion.div
                        key={item.id}
                        initial={item.id === newAlertId ? { opacity: 0, y: -8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`text-xs font-semibold uppercase ${
                              item.type === "critical"
                                ? "text-[#F87171]"
                                : item.type === "warning"
                                  ? "text-[#FBBF24]"
                                  : "text-[#60A5FA]"
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-xs text-[#9CA3AF]">{item.timestamp}</span>
                        </div>
                        <p className={`text-sm ${item.read ? "text-[#9CA3AF]" : "text-[#E5E7EB]"}`}>
                          {item.message}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-sm text-[#BFDBFE] transition hover:bg-[#3B82F6]/20"
                    onClick={() => {
                      navigate("/logs");
                      setNotificationsOpen(false);
                    }}
                  >
                    View all logs
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Open profile menu"
              onClick={() => {
                setProfileOpen(prev => !prev);
                setNotificationsOpen(false);
                setIsPaletteOpen(false);
              }}
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[#9CA3AF] transition hover:border-white/20 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-xs font-semibold text-white transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(59,130,246,0.55)]">
                {role === "admin" ? "AD" : "US"}
              </span>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-white">{role === "admin" ? "Admin User" : "Team User"}</p>
                <p className="text-xs text-[#9CA3AF]">{role === "admin" ? "Administrator" : "Security Member"}</p>
              </div>
              {role === "admin" && (
                <span className="hidden rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/15 px-2 py-0.5 text-[10px] font-semibold text-[#BFDBFE] md:inline">
                  Admin
                </span>
              )}
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0F172A]/95 p-2 shadow-2xl backdrop-blur"
                >
                  <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <Link to="/security" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                    <Shield className="h-4 w-4" /> Security
                  </Link>
                  <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[#E5E7EB] hover:bg-white/10">
                    <span className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      Real-time alerts
                    </span>
                    <button
                      type="button"
                      aria-label="Toggle real-time alerts"
                      onClick={() => setRealtimeAlerts(prev => !prev)}
                      className={`relative h-5 w-10 rounded-full transition ${
                        realtimeAlerts ? "bg-[#2563EB]" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          realtimeAlerts ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9CA3AF]">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#60A5FA]" />
                    {role === "admin" ? "Admin role active" : "User role active"}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                      navigate("/login");
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#FCA5A5] hover:bg-[#EF4444]/15"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
    <AnimatePresence>
      {isPaletteOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPaletteOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.985 }}
            className="fixed left-1/2 top-20 z-50 w-[92%] max-w-2xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0F172A]/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Command className="h-4 w-4 text-[#9CA3AF]" />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex(prev => (prev + 1) % Math.max(filteredSearchItems.length, 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex(prev =>
                      prev - 1 < 0 ? Math.max(filteredSearchItems.length - 1, 0) : prev - 1
                    );
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const selected = filteredSearchItems[activeIndex];
                    runSearchAction(selected);
                  }
                }}
                placeholder="Search logs, users, files..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#9CA3AF]"
              />
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              {query.trim() ? (
                filteredSearchItems.length > 0 ? (
                  <>
                    {renderGroup("Logs", groupedSearchItems.log, 0)}
                    {renderGroup("Users", groupedSearchItems.user, groupedSearchItems.log.length)}
                    {renderGroup(
                      "Files",
                      groupedSearchItems.file,
                      groupedSearchItems.log.length + groupedSearchItems.user.length
                    )}
                  </>
                ) : (
                  <p className="px-3 py-4 text-sm text-[#9CA3AF]">No matches found.</p>
                )
              ) : (
                <div className="px-2 py-1">
                  <p className="mb-2 px-1 text-xs uppercase tracking-wide text-[#9CA3AF]">Recent searches</p>
                  {recentSearches.length ? (
                    recentSearches.map(entry => (
                      <button
                        type="button"
                        key={entry}
                        onClick={() => {
                          setQuery(entry);
                          setActiveIndex(0);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#E5E7EB] hover:bg-white/10"
                      >
                        <Search className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        {entry}
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-2 text-sm text-[#9CA3AF]">No recent searches yet.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
