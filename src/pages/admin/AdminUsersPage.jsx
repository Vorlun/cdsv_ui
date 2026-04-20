import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  CheckCircle2,
  PauseCircle,
  KeyRound,
  Laptop,
  Monitor,
  LogOut,
  MoreHorizontal,
  PenSquare,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  UserRoundCog,
  UserX,
  Users,
} from "lucide-react";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const seedUsers = [
  {
    id: "u1",
    name: "Admin Operator",
    email: "admin@test.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2026-04-19 09:10",
    devices: "3",
    joined: "2024-08-11",
    ips: ["10.1.1.20", "192.168.4.20"],
    uploads: 1245,
    score: 98,
    failedLogins: 1,
    locations: ["Berlin, DE", "Amsterdam, NL"],
  },
  {
    id: "u2",
    name: "User Analyst",
    email: "user@test.com",
    role: "Analyst",
    status: "Active",
    lastLogin: "2026-04-19 10:31",
    devices: "2",
    joined: "2025-02-16",
    ips: ["10.1.1.34"],
    uploads: 244,
    score: 92,
    failedLogins: 2,
    locations: ["London, UK"],
  },
  {
    id: "u3",
    name: "SOC Viewer",
    email: "soc.viewer@test.com",
    role: "Viewer",
    status: "Suspended",
    lastLogin: "2026-04-18 19:04",
    devices: "1",
    joined: "2025-07-01",
    ips: ["185.23.11.92"],
    uploads: 19,
    score: 78,
    failedLogins: 7,
    locations: ["Madrid, ES"],
  },
  {
    id: "u4",
    name: "Cloud Reviewer",
    email: "reviewer@test.com",
    role: "User",
    status: "Active",
    lastLogin: "2026-04-19 08:28",
    devices: "4",
    joined: "2025-11-04",
    ips: ["172.16.0.18", "172.16.0.32"],
    uploads: 502,
    score: 88,
    failedLogins: 0,
    locations: ["New York, US", "Boston, US"],
  },
];

const timelineActivity = [
  { id: 1, text: "user@test.com uploaded encrypted file", time: "2m ago", icon: ShieldCheck, tone: "text-[#6EE7B7]" },
  { id: 2, text: "admin@test.com changed permissions", time: "14m ago", icon: UserRoundCog, tone: "text-[#93C5FD]" },
  { id: 3, text: "viewer@test.com login blocked", time: "32m ago", icon: CircleAlert, tone: "text-[#FCA5A5]" },
];

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "User",
  status: "Active",
  allowedDevices: "1",
  notes: "",
};

const statusClass = (status) =>
  status === "Active" ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#EF4444]/20 text-[#FCA5A5]";

const roleClass = (role) =>
  role === "Admin"
    ? "bg-[#7C3AED]/20 text-[#C4B5FD]"
    : role === "Analyst"
      ? "bg-[#2563EB]/20 text-[#93C5FD]"
      : "bg-[#3B82F6]/20 text-[#BFDBFE]";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%*_-+=";
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

function FloatingInput({ label, value, onChange, type = "text", error }) {
  return (
    <label className="relative block">
      <input
        value={value}
        type={type}
        onChange={onChange}
        placeholder=" "
        className={`peer w-full rounded-xl border bg-[#0B1220] px-3 pb-2 pt-5 text-sm text-[#E5E7EB] outline-none transition ${
          error ? "border-[#EF4444]/50" : "border-white/10 focus:border-[#3B82F6]/60 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
        }`}
      />
      <span className="pointer-events-none absolute left-3 top-3 text-xs text-[#9CA3AF] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs">
        {label}
      </span>
      {error && <span className="mt-1 block text-xs text-[#FCA5A5]">{error}</span>}
    </label>
  );
}

function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 560;
    const frames = 28;
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

function SecurityRing({ score }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="8" />
        <motion.circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#A7F3D0]">{score}</div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState(seedUsers);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [drawerMode, setDrawerMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [detailTab, setDetailTab] = useState("Overview");
  const [menuFocusIndex, setMenuFocusIndex] = useState(0);
  const [focusedField, setFocusedField] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const menuRef = useRef(null);
  const pageSize = 4;
  const debouncedSearch = useDebouncedValue(search, 180);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activeMenu) setActiveMenu(null);
        if (selectedUser) setSelectedUser(null);
        if (drawerMode) {
          if (hasUnsavedChanges) {
            setShowUnsavedConfirm(true);
          } else {
            setDrawerMode(null);
          }
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeMenu, drawerMode, hasUnsavedChanges, selectedUser]);

  const pushToast = (text) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  };

  const filteredUsers = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    const rows = users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(s) || user.email.toLowerCase().includes(s);
      const matchesRole = roleFilter === "All Roles" || user.role === roleFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
    return [...rows].sort((a, b) => {
      const aValue = String(a[sortBy] ?? "").toLowerCase();
      const bValue = String(b[sortBy] ?? "").toLowerCase();
      const result = aValue.localeCompare(bValue, undefined, { numeric: true });
      return sortDir === "asc" ? result : -result;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const currentPageIds = pagedUsers.map((u) => u.id);
  const allOnPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const metrics = useMemo(() => {
    const active = users.filter((u) => u.status === "Active").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    return [
      { label: "Total Users", value: users.length, trend: "+8%", icon: Users, trendUp: true },
      { label: "Active Users", value: active, trend: "+5%", icon: UserCheck, trendUp: true },
      { label: "Suspended", value: suspended, trend: "-1%", icon: UserX, trendUp: false },
      { label: "New This Week", value: 2, trend: "+18%", icon: UserPlus, trendUp: true },
    ];
  }, [users]);

  const setSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("asc");
  };

  const updateStatus = (id, status) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    setActiveMenu(null);
    pushToast(`User status updated to ${status}`);
  };

  const deleteUser = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    if (selectedUser?.id === id) setSelectedUser(null);
    setActiveMenu(null);
    pushToast("User deleted");
  };

  const exportCsv = (rows = filteredUsers) => {
    const csv = [
      "name,email,role,status,lastLogin,devices",
      ...rows.map((u) => `"${u.name}","${u.email}","${u.role}","${u.status}","${u.lastLogin}","${u.devices}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "users-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("CSV export ready");
  };

  const applyBulk = (action) => {
    if (!selectedIds.length) return;
    if (action === "suspend") {
      setUsers((prev) => prev.map((u) => (selectedIds.includes(u.id) ? { ...u, status: "Suspended" } : u)));
      pushToast("Selected users suspended");
    }
    if (action === "activate") {
      setUsers((prev) => prev.map((u) => (selectedIds.includes(u.id) ? { ...u, status: "Active" } : u)));
      pushToast("Selected users activated");
    }
    if (action === "export") {
      exportCsv(users.filter((u) => selectedIds.includes(u.id)));
    }
    if (action === "delete") {
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      pushToast("Selected users deleted");
    }
    setSelectedIds([]);
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setForm(emptyForm);
    setFormErrors({});
    setHasUnsavedChanges(false);
  };

  const openEditDrawer = (user) => {
    setDrawerMode("edit");
    setForm({
      fullName: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      allowedDevices: user.devices,
      notes: "",
    });
    setFormErrors({});
    setHasUnsavedChanges(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email";
    if (!form.password || passwordStrength(form.password) < 2) errors.password = "Use a stronger password";
    if (!String(form.allowedDevices).trim()) errors.allowedDevices = "Allowed devices required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setTimeout(() => {
      setUsers((prev) => {
        if (drawerMode === "edit") {
          return prev.map((u) =>
            u.email === form.email || u.name === form.fullName
              ? { ...u, name: form.fullName, role: form.role, status: form.status, devices: form.allowedDevices }
              : u
          );
        }
        return [
          {
            id: `u-${Date.now()}`,
            name: form.fullName,
            email: form.email,
            role: form.role,
            status: form.status,
            lastLogin: "Never",
            devices: form.allowedDevices,
            joined: new Date().toISOString().slice(0, 10),
            ips: [],
            uploads: 0,
            score: 85,
            failedLogins: 0,
            locations: ["Not available yet"],
          },
          ...prev,
        ];
      });
      setSubmitting(false);
      setDrawerMode(null);
      setHasUnsavedChanges(false);
      pushToast(drawerMode === "edit" ? "User updated successfully" : "User created successfully");
    }, 900);
  };

  const formStrength = passwordStrength(form.password);
  const detail = selectedUser;
  const sessionCount = detail ? Math.max(1, Number(detail.devices || 0) - 1) : 0;
  const detailDevices = detail
    ? [
        { id: "d1", label: "MacBook Pro", trusted: true, lastActive: "3 min ago", ip: detail.ips[0] || "10.0.0.1", icon: Laptop },
        { id: "d2", label: "iPhone 15", trusted: true, lastActive: "11 min ago", ip: detail.ips[1] || "10.0.0.22", icon: Smartphone },
        { id: "d3", label: "Windows Desktop", trusted: false, lastActive: "1 day ago", ip: "45.22.11.8", icon: Monitor },
      ]
    : [];
  const securityTrend = [45, 72, 62, 81, 69, 88, 92];
  const detailTimeline = [
    { id: "a1", title: "Uploaded encrypted file", time: "5 min ago", icon: ShieldCheck, tone: "text-[#6EE7B7]" },
    { id: "a2", title: "Password changed", time: "22 min ago", icon: KeyRound, tone: "text-[#93C5FD]" },
    { id: "a3", title: "Login blocked", time: "1 hr ago", icon: CircleAlert, tone: "text-[#FCA5A5]" },
    { id: "a4", title: "Token refreshed", time: "2 hrs ago", icon: Activity, tone: "text-[#C4B5FD]" },
  ];
  const menuActions = [
    { id: "view", label: "View Details", icon: Eye, tone: "text-[#E5E7EB]" },
    { id: "edit", label: "Edit User", icon: PenSquare, tone: "text-[#BFDBFE]" },
    { id: "suspend", label: "Suspend User", icon: PauseCircle, tone: "text-[#FCA5A5]" },
    { id: "activate", label: "Activate User", icon: CheckCircle2, tone: "text-[#6EE7B7]" },
    { id: "reset", label: "Reset Password", icon: KeyRound, tone: "text-[#BFDBFE]" },
    { id: "logout", label: "Force Logout", icon: LogOut, tone: "text-[#FDE68A]" },
    { id: "delete", label: "Delete User", icon: Trash2, tone: "text-[#FCA5A5]" },
  ];

  const runMenuAction = (actionId, user) => {
    if (actionId === "view") setSelectedUser(user);
    if (actionId === "edit") openEditDrawer(user);
    if (actionId === "suspend") updateStatus(user.id, "Suspended");
    if (actionId === "activate") updateStatus(user.id, "Active");
    if (actionId === "reset") pushToast("Password reset link sent");
    if (actionId === "logout") pushToast("Session control: forced logout triggered");
    if (actionId === "delete") deleteUser(user.id);
    setActiveMenu(null);
  };

  const closeFormDrawer = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }
    setDrawerMode(null);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26 }}
                className="rounded-2xl border border-[#3B82F6]/20 bg-[#111827]/95 p-4 shadow-[0_0_22px_rgba(59,130,246,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3B82F6]/40 hover:shadow-[0_0_28px_rgba(59,130,246,0.15)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-[#9CA3AF]">{metric.label}</span>
                  <Icon className="h-5 w-5 text-[#93C5FD]" />
                </div>
                <div className="text-2xl font-semibold text-white">
                  <AnimatedCount value={metric.value} />
                </div>
                <div className={`mt-1 flex items-center gap-1 text-xs ${metric.trendUp ? "text-[#6EE7B7]" : "text-[#FCA5A5]"}`}>
                  {metric.trendUp ? <ArrowUpWideNarrow className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
                  {metric.trend} vs last period
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4 shadow-[0_0_24px_rgba(59,130,246,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search users..."
                className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB] outline-none transition focus:border-[#3B82F6]/60"
              />
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
                <option>Analyst</option>
                <option>Viewer</option>
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]">
                <option>All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-2 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/15 px-3 py-2 text-sm text-[#BFDBFE] transition hover:bg-[#3B82F6]/25">
                <Plus className="h-4 w-4" />
                Add User
              </button>
              <button type="button" onClick={() => exportCsv()} className="inline-flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/25">
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={() => applyBulk("suspend")} disabled={!selectedIds.length} className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2.5 py-1.5 text-[#FCA5A5] disabled:opacity-40">Suspend selected</button>
            <button type="button" onClick={() => applyBulk("activate")} disabled={!selectedIds.length} className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1.5 text-[#A7F3D0] disabled:opacity-40">Activate selected</button>
            <button type="button" onClick={() => applyBulk("export")} disabled={!selectedIds.length} className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2.5 py-1.5 text-[#BFDBFE] disabled:opacity-40">Export selected</button>
            <button type="button" onClick={() => applyBulk("delete")} disabled={!selectedIds.length} className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/10 px-2.5 py-1.5 text-[#FDBA74] disabled:opacity-40">Delete selected</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95 shadow-[0_0_24px_rgba(59,130,246,0.06)]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-12 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#9CA3AF]">No users found for current filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-[#0F172A]">
                    <tr className="text-left text-xs uppercase tracking-wide text-[#9CA3AF]">
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={() => {
                            if (allOnPageSelected) {
                              setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
                            } else {
                              setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
                            }
                          }}
                          className="h-4 w-4 rounded border-white/20 bg-[#0B1220]"
                        />
                      </th>
                      <th className="px-4 py-3">Avatar</th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("name")} className="inline-flex items-center gap-1">Name <ArrowDownWideNarrow className="h-3.5 w-3.5" /></button>
                      </th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("role")} className="inline-flex items-center gap-1">Role <ArrowDownWideNarrow className="h-3.5 w-3.5" /></button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("status")} className="inline-flex items-center gap-1">Status <ArrowDownWideNarrow className="h-3.5 w-3.5" /></button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("lastLogin")} className="inline-flex items-center gap-1">Last Login <ArrowDownWideNarrow className="h-3.5 w-3.5" /></button>
                      </th>
                      <th className="px-4 py-3">Trusted Devices</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((user) => (
                      <tr key={user.id} onClick={() => setSelectedUser(user)} className="group cursor-pointer border-t border-white/5 text-sm text-[#E5E7EB] transition hover:bg-[#1A2436]/70">
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() =>
                              setSelectedIds((prev) => (prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]))
                            }
                            className="h-4 w-4 rounded border-white/20 bg-[#0B1220]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6]/20 font-medium text-[#BFDBFE]">
                            {getInitials(user.name)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-[#C7D2FE]">{user.email}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${roleClass(user.role)}`}>{user.role}</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(user.status)}`}>{user.status}</span></td>
                        <td className="px-4 py-3 text-[#93C5FD]">{user.lastLogin}</td>
                        <td className="px-4 py-3">{user.devices}</td>
                        <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu((prev) => (prev === user.id ? null : user.id));
                              setMenuFocusIndex(0);
                            }}
                            className="rounded-lg border border-white/10 p-1.5 text-[#C7D2FE] transition hover:border-[#3B82F6]/40 hover:bg-white/5"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeMenu === user.id && (
                            <motion.div
                              ref={menuRef}
                              role="menu"
                              tabIndex={0}
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8 }}
                              onKeyDown={(event) => {
                                if (event.key === "ArrowDown") {
                                  event.preventDefault();
                                  setMenuFocusIndex((prev) => (prev + 1) % menuActions.length);
                                }
                                if (event.key === "ArrowUp") {
                                  event.preventDefault();
                                  setMenuFocusIndex((prev) => (prev - 1 + menuActions.length) % menuActions.length);
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  runMenuAction(menuActions[menuFocusIndex].id, user);
                                }
                                if (event.key === "Escape") setActiveMenu(null);
                              }}
                              className="absolute right-4 top-12 z-20 w-52 rounded-xl border border-white/15 bg-[#0B1220]/85 p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur-md"
                            >
                              {menuActions.map((action, index) => {
                                const Icon = action.icon;
                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    role="menuitem"
                                    onMouseEnter={() => setMenuFocusIndex(index)}
                                    onClick={() => runMenuAction(action.id, user)}
                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                                      index === menuFocusIndex ? "translate-x-0.5 bg-white/10" : ""
                                    } ${action.tone}`}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {action.label}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#9CA3AF]">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex gap-2">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-40">Prev</button>
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">Recent User Activity Timeline</h3>
          <div className="space-y-3">
            {timelineActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0F172A]/70 px-3 py-3 transition hover:border-[#3B82F6]/30">
                  <div className={`mt-0.5 rounded-md bg-white/5 p-1.5 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-sm text-[#D1D5DB]">{item.text}</div>
                  <div className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.time}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {detail && (
          <>
            <motion.button type="button" onClick={() => setSelectedUser(null)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              initial={{ x: "100%", opacity: 0.94 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.14)]"
            >
              <div className="border-b border-white/10 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[#E5E7EB]">User Profile Panel</h3>
                  <button type="button" onClick={() => setSelectedUser(null)} className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white">Close</button>
                </div>
                <div className="rounded-xl border border-[#3B82F6]/25 bg-gradient-to-br from-[#172554]/55 via-[#1E293B]/70 to-[#111827]/80 p-3 shadow-[0_0_24px_rgba(59,130,246,0.16)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/20 text-lg font-semibold text-[#BFDBFE] shadow-[0_0_18px_rgba(59,130,246,0.3)]">
                      {getInitials(detail.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">
                        {detail.name}
                        {detail.role === "Admin" ? <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-[#6EE7B7]" /> : null}
                      </div>
                      <div className="truncate text-xs text-[#93C5FD]">{detail.email}</div>
                      <div className="mt-0.5 text-[11px] text-[#9CA3AF]">Last active: 5 min ago</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] ${roleClass(detail.role)}`}>{detail.role}</span>
                        <span className={`rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] ${statusClass(detail.status)}`}>{detail.status}</span>
                      </div>
                    </div>
                    <SecurityRing score={detail.score} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-[#111827]/65 p-1 text-xs">
                  {["Overview", "Security", "Devices", "Activity"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setDetailTab(tab)}
                      className={`rounded-md px-2 py-1.5 transition ${
                        detailTab === tab
                          ? "bg-[#3B82F6]/20 text-[#BFDBFE] shadow-[0_0_12px_rgba(59,130,246,0.18)]"
                          : "text-[#9CA3AF] hover:bg-white/5 hover:text-[#BFDBFE]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-[#D1D5DB]">
                <AnimatePresence mode="wait">
                  {detailTab === "Overview" && (
                    <motion.section
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30">
                          <div className="text-[#9CA3AF]">Upload Count</div>
                          <div className="mt-1 text-sm font-semibold text-white">{detail.uploads}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30">
                          <div className="text-[#9CA3AF]">Sessions</div>
                          <div className="mt-1 text-sm font-semibold text-[#BFDBFE]">{sessionCount}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30">
                          <div className="text-[#9CA3AF]">Trusted Devices</div>
                          <div className="mt-1 text-sm font-semibold text-white">{detail.devices}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30">
                          <div className="text-[#9CA3AF]">Last Login</div>
                          <div className="mt-1 text-sm font-semibold text-[#93C5FD]">{detail.lastLogin}</div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-3 text-xs leading-relaxed text-[#C7D2FE]">
                        {detail.name} has strong account hygiene with monitored sessions, scoped access level, and continuous security telemetry for enterprise governance.
                      </div>
                    </motion.section>
                  )}

                  {detailTab === "Security" && (
                    <motion.section
                      key="security"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="space-y-2 rounded-lg border border-white/10 bg-[#111827]/65 p-3 text-xs">
                        <div className="flex items-center justify-between"><span className="text-[#9CA3AF]">Risk Score</span><span className="font-semibold text-[#A7F3D0]">{detail.score}</span></div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[#9CA3AF]">Known IPs</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            {detail.ips.map((ip) => (
                              <span key={ip} className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] text-[#BFDBFE]">{ip}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between"><span className="text-[#9CA3AF]">Failed Attempts</span><span className="rounded-full bg-[#EF4444]/20 px-2 py-0.5 text-[10px] text-[#FCA5A5]">{detail.failedLogins}</span></div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[#9CA3AF]">Locations</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            {detail.locations.map((location) => (
                              <span key={location} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-[#D1D5DB]">{location}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
                        <div className="mb-2 text-[11px] uppercase tracking-wide text-[#9CA3AF]">Login Trend</div>
                        <div className="flex h-16 items-end gap-1">
                          {securityTrend.map((value, idx) => (
                            <div key={`trend-${idx}`} className="flex-1 rounded-sm bg-[#3B82F6]/20">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${value}%` }}
                                transition={{ duration: 0.45, delay: idx * 0.04 }}
                                className="w-full rounded-sm bg-gradient-to-t from-[#3B82F6] to-[#10B981]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.section>
                  )}

                  {detailTab === "Devices" && (
                    <motion.section
                      key="devices"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2.5"
                    >
                      {detailDevices.map((device) => {
                        const Icon = device.icon;
                        return (
                          <div key={device.id} className="rounded-lg border border-white/10 bg-[#111827]/65 p-3 text-xs transition hover:-translate-y-0.5 hover:border-[#3B82F6]/30">
                            <div className="mb-1.5 flex items-start justify-between">
                              <div className="inline-flex items-center gap-2 text-sm text-white">
                                <Icon className="h-4 w-4 text-[#93C5FD]" />
                                {device.label}
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${device.trusted ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#EF4444]/20 text-[#FCA5A5]"}`}>
                                {device.trusted ? "Trusted" : "Untrusted"}
                              </span>
                            </div>
                            <div className="text-[#9CA3AF]">Last active: {device.lastActive}</div>
                            <div className="text-[#9CA3AF]">IP: {device.ip}</div>
                            <button
                              type="button"
                              onClick={() => pushToast(`${device.label} removed`)}
                              className="mt-2 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 text-[10px] text-[#FCA5A5] transition hover:bg-[#EF4444]/20"
                            >
                              Remove Device
                            </button>
                          </div>
                        );
                      })}
                    </motion.section>
                  )}

                  {detailTab === "Activity" && (
                    <motion.section
                      key="activity"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2"
                    >
                      {detailTimeline.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                            <span className={`mt-0.5 ${item.tone}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex-1 text-[#D1D5DB]">{item.title}</span>
                            <span className="text-[#9CA3AF]">{item.time}</span>
                          </div>
                        );
                      })}
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>
              <div className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-white/10 bg-[#0F172A]/95 px-4 py-3 shadow-[0_-10px_20px_rgba(2,6,23,0.45)] backdrop-blur">
                <button type="button" onClick={() => updateStatus(detail.id, "Suspended")} className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/15 px-2 py-2 text-xs text-[#FCA5A5] transition hover:bg-[#EF4444]/25 active:scale-[0.98]">Suspend User</button>
                <button type="button" onClick={() => pushToast("Password reset triggered")} className="rounded-lg border border-white/20 bg-white/5 px-2 py-2 text-xs text-[#D1D5DB] transition hover:border-[#3B82F6]/30 hover:text-[#BFDBFE] active:scale-[0.98]">Reset Password</button>
                <button type="button" onClick={() => pushToast("Session control: force logout sent")} className="rounded-lg border border-[#F59E0B]/35 bg-[#F59E0B]/15 px-2 py-2 text-xs text-[#FDE68A] transition hover:bg-[#F59E0B]/25 active:scale-[0.98]">Force Logout</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerMode && (
          <>
            <motion.button type="button" onClick={() => setDrawerMode(null)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              initial={{ x: "100%", opacity: 0.94 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.14)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-base font-semibold text-[#E5E7EB]">{drawerMode === "edit" ? "Edit User" : "Add User"}</h3>
                <button type="button" onClick={closeFormDrawer} className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white">Close</button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/20 text-sm font-semibold text-[#BFDBFE]">
                    {getInitials(form.fullName || "NN")}
                  </div>
                  <div>
                    <div className="text-xs text-[#9CA3AF]">Avatar Preview</div>
                    <div className="text-sm text-[#E5E7EB]">{form.fullName || "New User"}</div>
                  </div>
                </div>
                <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                  <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Profile</h4>
                  <FloatingInput
                    label="Full Name"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, fullName: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    error={formErrors.fullName}
                  />
                  <div className="mt-3">
                    <FloatingInput
                      label="Email"
                      value={form.email}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, email: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      error={formErrors.email}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                  <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Access</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {["Admin", "User", "Analyst", "Viewer"].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, role }));
                          setHasUnsavedChanges(true);
                        }}
                        className={`rounded-lg border px-2 py-2 text-xs transition ${
                          form.role === role
                            ? "border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#BFDBFE]"
                            : "border-white/10 bg-[#0B1220] text-[#9CA3AF] hover:border-white/20"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-[#0B1220] p-1">
                    <div className="text-[10px] uppercase text-[#9CA3AF]">Status</div>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {["Active", "Suspended"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, status }));
                            setHasUnsavedChanges(true);
                          }}
                          className={`rounded-md px-2 py-1.5 text-xs transition ${
                            form.status === status
                              ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                              : "text-[#9CA3AF] hover:bg-white/5"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                  <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Security</h4>
                  <label className="block text-[#D1D5DB]">Password
                  <div className={`mt-1 flex gap-2 rounded-xl border ${focusedField === "password" ? "border-[#3B82F6]/50 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" : "border-white/10"} bg-[#0B1220] p-1`}>
                    <input
                      value={form.password}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, password: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-transparent px-2 py-1.5 text-[#E5E7EB] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, password: generateSecurePassword() }));
                        setHasUnsavedChanges(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 text-xs text-[#BFDBFE] transition active:scale-[0.98]"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Generate
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full transition-all ${formStrength <= 1 ? "bg-[#EF4444]" : formStrength <= 2 ? "bg-[#F59E0B]" : formStrength <= 3 ? "bg-[#3B82F6]" : "bg-[#10B981]"}`} style={{ width: `${(formStrength / 4) * 100}%` }} />
                  </div>
                  {formErrors.password && <span className="mt-1 block text-xs text-[#FCA5A5]">{formErrors.password}</span>}
                  </label>
                  <div className="mt-3">
                    <label className="block text-[#D1D5DB]">Allowed Devices</label>
                    <div className="mt-1 inline-flex items-center rounded-lg border border-white/10 bg-[#0B1220]">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, Number(form.allowedDevices || 0) - 1);
                          setForm((prev) => ({ ...prev, allowedDevices: String(next) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="px-2 py-1.5 text-[#9CA3AF] hover:bg-white/5"
                      >
                        -
                      </button>
                      <span className="min-w-10 px-2 text-center text-[#E5E7EB]">{form.allowedDevices}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Number(form.allowedDevices || 0) + 1;
                          setForm((prev) => ({ ...prev, allowedDevices: String(next) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="px-2 py-1.5 text-[#9CA3AF] hover:bg-white/5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {formErrors.allowedDevices && <span className="mt-1 block text-xs text-[#FCA5A5]">{formErrors.allowedDevices}</span>}
                </section>

                <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                  <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Preferences</h4>
                  <label className="block text-[#D1D5DB]">Notes
                    <textarea
                      value={form.notes}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, notes: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2 text-[#E5E7EB] outline-none transition focus:border-[#3B82F6]/60 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    />
                  </label>
                </section>
              </div>
              <div className="sticky bottom-0 border-t border-white/10 bg-[#0F172A]/95 px-5 py-3 backdrop-blur">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={closeFormDrawer} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB] transition active:scale-[0.98]">
                    Cancel
                  </button>
                  <button type="button" onClick={submitForm} disabled={submitting} className="rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/20 px-3 py-2 text-sm text-[#BFDBFE] shadow-[0_0_16px_rgba(59,130,246,0.24)] transition hover:bg-[#3B82F6]/30 active:scale-[0.98] disabled:opacity-60">
                    {submitting ? "Saving..." : drawerMode === "edit" ? "Save Changes" : "Create User"}
                  </button>
                </div>
                {hasUnsavedChanges && !submitting && (
                  <p className="mt-2 text-xs text-[#FDE68A]">You have unsaved changes.</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnsavedConfirm && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[90] bg-black/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnsavedConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed left-1/2 top-1/2 z-[91] w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-[#0F172A] p-4 shadow-2xl"
            >
              <h4 className="text-sm font-semibold text-white">Discard unsaved changes?</h4>
              <p className="mt-1 text-xs text-[#9CA3AF]">You have pending edits. Closing now will lose your changes.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowUnsavedConfirm(false)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB]">
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    setDrawerMode(null);
                    setHasUnsavedChanges(false);
                  }}
                  className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 px-3 py-2 text-sm text-[#FCA5A5]"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_14px_rgba(59,130,246,0.2)]"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
