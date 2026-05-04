import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { normalizeSocError } from "@/services/apiErrorHandler";
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
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useUsers } from "@/hooks/useUsers";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { sanitizePlainText } from "@/utils/sanitize";
import { validateUserForm, validateUserField } from "@/utils/userFormValidation";
import { computeSecurityScore } from "@/utils/securityScore";

const statusClass = (status) =>
  status === "Active" ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#EF4444]/20 text-[#FCA5A5]";

const roleClass = (role) =>
  role === "Admin"
    ? "bg-[#7C3AED]/20 text-[#C4B5FD]"
    : role === "Analyst"
      ? "bg-[#2563EB]/20 text-[#93C5FD]"
      : "bg-[#3B82F6]/20 text-[#BFDBFE]";

const ACTIVITY_ICONS = Object.freeze({
  shield: ShieldCheck,
  cog: UserRoundCog,
  alert: CircleAlert,
  activity: Activity,
  key: KeyRound,
});

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "User",
  status: "Active",
  allowedDevices: "1",
  notes: "",
};

function getInitials(name) {
  return sanitizePlainText(String(name ?? "NN"), 120)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%*_-+=";
  const values = new Uint32Array(16);
  window.crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

function FloatingInput({ label, value, onChange, onBlur, type = "text", error, hint, maxLength }) {
  return (
    <label className="relative block">
      <input
        value={value}
        maxLength={maxLength}
        type={type}
        onChange={onChange}
        onBlur={onBlur}
        placeholder=" "
        aria-invalid={Boolean(error)}
        className={`peer w-full rounded-xl border bg-[#0B1220] px-3 pb-2 pt-5 text-sm text-[#E5E7EB] outline-none transition ${
          error ? "border-[#EF4444]/50" : "border-white/10 focus:border-[#3B82F6]/60 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
        }`}
      />
      <span className="pointer-events-none absolute left-3 top-3 text-xs text-[#9CA3AF] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs">
        {label}
      </span>
      {hint ? <span className="mt-1 block text-[11px] text-[#64748b]">{hint}</span> : null}
      {error ? (
        <span className="mt-1 block text-xs text-[#FCA5A5]" role="alert">
          {error}
        </span>
      ) : null}
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

export default memo(function AdminUsersPage() {
  const {
    users,
    status: usersFetchStatus,
    error: usersFetchError,
    isEmpty,
    callerRole,
    createUser,
    updateUser,
    deleteUser,
    bulkSetStatus,
    bulkDelete,
    fetchProfile,
    retry,
  } = useUsers();

  const canManageRoles = callerRole === "admin";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [activeMenu, setActiveMenu] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [drawerMode, setDrawerMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [detailTab, setDetailTab] = useState("Overview");
  const [menuFocusIndex, setMenuFocusIndex] = useState(0);
  const [focusedField, setFocusedField] = useState("");
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dangerModal, setDangerModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const menuRef = useRef(null);
  const headerSelectRef = useRef(null);
  const pageSize = 4;
  const debouncedSearch = useDebouncedValue(search, 220);

  const safeSearch = useMemo(() => sanitizePlainText(debouncedSearch, 200).toLowerCase(), [debouncedSearch]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (dangerModal) setDangerModal(null);
        if (activeMenu) setActiveMenu(null);
        if (detailId) setDetailId(null);
        if (drawerMode) {
          if (hasUnsavedChanges) setShowUnsavedConfirm(true);
          else setDrawerMode(null);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeMenu, drawerMode, hasUnsavedChanges, detailId, dangerModal]);

  const pushToast = useCallback((text) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    const safe = sanitizePlainText(text, 400);
    setToasts((prev) => [...prev, { id, text: safe }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  const searchableUsers = useMemo(
    () =>
      users.map((u) => ({
        raw: u,
        hay:
          `${sanitizePlainText(u.name, 220)} ${sanitizePlainText(u.email, 254)}`.toLowerCase(),
      })),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const s = safeSearch.trim();
    const bucket = searchableUsers.filter(({ raw, hay }) => {
      const matchesSearch = !s || hay.includes(s);
      const matchesRole = roleFilter === "All Roles" || raw.role === roleFilter;
      const matchesStatus = statusFilter === "All" || raw.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
    return [...bucket].sort((a, b) => {
      const aa = String(a.raw[sortBy] ?? "").toLowerCase();
      const bb = String(b.raw[sortBy] ?? "").toLowerCase();
      const result = aa.localeCompare(bb, undefined, { numeric: true });
      return sortDir === "asc" ? result : -result;
    });
  }, [searchableUsers, safeSearch, roleFilter, statusFilter, sortBy, sortDir]);

  const filteredRows = filteredUsers.map((x) => x.raw);
  const filteredIdsAll = useMemo(() => filteredRows.map((u) => u.id), [filteredRows]);
  const allFilteredSelected =
    filteredIdsAll.length > 0 && filteredIdsAll.every((id) => selectedIds.includes(id));

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedUsers = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const currentPageIds = pagedUsers.map((u) => u.id);

  const pageFullySelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const pagePartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !pageFullySelected;

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = pagePartiallySelected;
  }, [pagePartiallySelected]);

  useEffect(() => {
    if (!detailId) {
      setProfileData(null);
      return undefined;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileData(null);
    void fetchProfile(detailId)
      .then((payload) => {
        if (!cancelled) setProfileData(payload);
      })
      .catch(() => !cancelled && pushToast("Profile enrichment failed"))
      .finally(() => !cancelled && setProfileLoading(false));
    return () => {
      cancelled = true;
    };
  }, [detailId, fetchProfile, pushToast]);

  useEffect(() => {
    if (detailId && !users.some((u) => u.id === detailId)) setDetailId(null);
  }, [users, detailId]);

  const metrics = useMemo(() => {
    const active = users.filter((u) => u.status === "Active").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recent = users.filter((u) => {
      const t = Date.parse(u.joined);
      return !Number.isNaN(t) && t >= cutoff.getTime();
    }).length;
    return [
      { label: "Total Users", value: users.length, trend: "+8%", icon: Users, trendUp: true },
      { label: "Active Users", value: active, trend: "+5%", icon: UserCheck, trendUp: true },
      { label: "Suspended", value: suspended, trend: "-1%", icon: UserX, trendUp: false },
      { label: "New (7 days)", value: recent, trend: "+18%", icon: UserPlus, trendUp: true },
    ];
  }, [users]);

  const selectedSummary = detailId ? users.find((u) => u.id === detailId) ?? null : null;
  const mergedDetail = selectedSummary ? { ...selectedSummary, ...(profileData || {}) } : null;
  const displayScore =
    mergedDetail != null ? mergedDetail.score ?? computeSecurityScore(mergedDetail) : 0;

  const setSort = (key) => {
    if (sortBy === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const exportCsvRows = useCallback((rows = filteredRows) => {
    const csv = [
      "name,email,role,status,lastLogin,devices",
      ...rows.map((u) =>
        [
          sanitizePlainText(u.name, 200),
          sanitizePlainText(u.email, 254),
          sanitizePlainText(u.role, 32),
          sanitizePlainText(u.status, 32),
          sanitizePlainText(u.lastLogin, 40),
          sanitizePlainText(u.devices, 8),
        ]
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iam-users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("CSV export ready");
  }, [filteredRows, pushToast]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditTarget(null);
    setForm(emptyForm);
    setFormErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setHasUnsavedChanges(false);
  };

  const openEditDrawer = useCallback((user) => {
    setDrawerMode("edit");
    setEditTarget(user);
    setForm({
      fullName: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      allowedDevices: user.devices,
      notes: sanitizePlainText(user.notes ?? "", 2000),
    });
    setFormErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setHasUnsavedChanges(false);
  }, []);

  const markTouched = useCallback((key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const blurValidate = useCallback(
    (field, patch) => {
      const merged = { ...form, ...(patch ?? {}) };
      const err = validateUserField(field, merged[field], merged, {
        mode: drawerMode === "edit" ? "edit" : "create",
        authRole: callerRole,
        editingUser: editTarget,
      });
      setFormErrors((prev) => ({ ...prev, [field]: err ? err : undefined }));
    },
    [form, drawerMode, callerRole, editTarget],
  );

  const submitForm = async () => {
    setSubmitAttempted(true);
    const mode = drawerMode === "edit" ? "edit" : "create";
    const errs = validateUserForm(form, {
      mode,
      passwordRequired: mode === "create",
      authRole: callerRole,
      targetCurrentRole: editTarget?.role,
    });
    Object.keys(errs).forEach((k) => {
      if (!errs[k]) delete errs[k];
    });
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const patch = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        allowedDevices: form.allowedDevices,
        notes: sanitizePlainText(form.notes, 2000),
      };
      if (mode === "create") {
        await createUser({ ...patch, password: form.password });
        pushToast("User created successfully");
      } else {
        if (form.password.trim()) patch.password = form.password;
        await updateUser(editTarget.id, patch);
        pushToast("User updated successfully");
      }
      setDrawerMode(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      pushToast(normalizeSocError(err).message ?? "Save rejected by IAM gateway");
    } finally {
      setSubmitting(false);
    }
  };

  const formStrength = passwordStrength(form.password);

  const runSingleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      if (detailId === userId) setDetailId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== userId));
      pushToast("User deleted");
    } catch (err) {
      pushToast(normalizeSocError(err).message ?? "Deletion blocked");
    }
  };

  const menuActions = useMemo(
    () => [
      { id: "view", label: "View Details", icon: Eye, tone: "text-[#E5E7EB]" },
      { id: "edit", label: "Edit User", icon: PenSquare, tone: "text-[#BFDBFE]" },
      { id: "suspend", label: "Suspend User", icon: PauseCircle, tone: "text-[#FCA5A5]" },
      { id: "activate", label: "Activate User", icon: CheckCircle2, tone: "text-[#6EE7B7]" },
      { id: "reset", label: "Reset Password", icon: KeyRound, tone: "text-[#BFDBFE]" },
      { id: "logout", label: "Force Logout", icon: LogOut, tone: "text-[#FDE68A]" },
      { id: "delete", label: "Delete User", icon: Trash2, tone: "text-[#FCA5A5]" },
    ],
    [],
  );

  const updateStatusInline = async (id, status) => {
    try {
      await updateUser(id, { status });
      setActiveMenu(null);
      pushToast(`User status updated to ${sanitizePlainText(status, 24)}`);
    } catch {
      pushToast("Status change failed — policy or gateway denied");
    }
  };

  const runMenuAction = (actionId, user) => {
    if (actionId === "view") setDetailId(user.id);
    if (actionId === "edit") openEditDrawer(user);
    if (actionId === "suspend") void updateStatusInline(user.id, "Suspended");
    if (actionId === "activate") void updateStatusInline(user.id, "Active");
    if (actionId === "reset") pushToast("Password reset envelope queued");
    if (actionId === "logout") pushToast("Session tokens revoked (simulated)");
    if (actionId === "delete") setDangerModal({ kind: "single-delete", id: user.id, label: user.name });
    setActiveMenu(null);
  };

  const closeFormDrawer = () => {
    if (hasUnsavedChanges) setShowUnsavedConfirm(true);
    else setDrawerMode(null);
  };

  const detailDevices =
    mergedDetail != null
      ? [
          { id: "d1", label: "Corporate laptop", trusted: true, lastActive: "3 min ago", ip: mergedDetail.ips?.[0] ?? "—", icon: Laptop },
          { id: "d2", label: "SO mobile", trusted: true, lastActive: "11 min ago", ip: mergedDetail.ips?.[1] ?? "—", icon: Smartphone },
          { id: "d3", label: "Remote desktop", trusted: false, lastActive: "1 day ago", ip: "Pending IP reveal", icon: Monitor },
        ]
      : [];

  const riskSeriesRaw = mergedDetail?.riskSeries;
  const securityTrend =
    Array.isArray(riskSeriesRaw) && riskSeriesRaw.length
      ? riskSeriesRaw
      : [45, 72, 62, 81, 69, 88, Math.min(displayScore + 5, 100)];

  const activityItems = mergedDetail?.activity ?? [];

  const toolbarLoading = usersFetchStatus === "loading";

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {usersFetchStatus === "error" ? (
          <ErrorBanner
            title="IAM directory unavailable"
            message={sanitizePlainText(usersFetchError ?? "Unable to retrieve catalogue.", 400)}
            onRetry={() => void retry()}
          />
        ) : null}

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
                  <span className="text-sm text-[#9CA3AF]">{sanitizePlainText(metric.label, 64)}</span>
                  <Icon className="h-5 w-5 text-[#93C5FD]" />
                </div>
                <div className="text-2xl font-semibold text-white">
                  {toolbarLoading ? "—" : <AnimatedCount value={metric.value} />}
                </div>
                <div
                  className={`mt-1 flex items-center gap-1 text-xs ${metric.trendUp ? "text-[#6EE7B7]" : "text-[#FCA5A5]"}`}
                >
                  {metric.trendUp ? (
                    <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                  )}
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
                  setSearch(sanitizePlainText(e.target.value, 220));
                  setPage(1);
                }}
                placeholder="Search name or email..."
                aria-label="Search directory"
                disabled={toolbarLoading && users.length === 0}
                className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB] outline-none transition focus:border-[#3B82F6]/60"
              />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
                <option>Analyst</option>
                <option>Viewer</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E5E7EB]"
              >
                <option>All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
              <button
                type="button"
                disabled={filteredIdsAll.length === 0}
                onClick={() => {
                  if (allFilteredSelected) {
                    setSelectedIds((prev) => prev.filter((id) => !filteredIdsAll.includes(id)));
                  } else {
                    setSelectedIds(filteredIdsAll);
                  }
                }}
                className="rounded-lg border border-[#3B82F6]/30 px-3 py-2 text-xs text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allFilteredSelected ? `Clear filtered (${filteredIdsAll.length})` : `Select all matching (${filteredIdsAll.length})`}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreateDrawer}
                className="inline-flex items-center gap-2 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/15 px-3 py-2 text-sm text-[#BFDBFE] transition hover:bg-[#3B82F6]/25"
              >
                <Plus className="h-4 w-4" />
                Add User
              </button>
              <button
                type="button"
                onClick={() => exportCsvRows()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/15 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/25"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (!selectedIds.length) return;
                setDangerModal({
                  kind: "bulk-suspend",
                  ids: [...selectedIds],
                  count: selectedIds.length,
                });
              }}
              disabled={!selectedIds.length}
              className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2.5 py-1.5 text-[#FCA5A5] disabled:opacity-40"
            >
              Suspend selected
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedIds.length) return;
                setDangerModal({
                  kind: "bulk-activate",
                  ids: [...selectedIds],
                  count: selectedIds.length,
                });
              }}
              disabled={!selectedIds.length}
              className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1.5 text-[#A7F3D0] disabled:opacity-40"
            >
              Activate selected
            </button>
            <button
              type="button"
              onClick={() => exportCsvRows(users.filter((u) => selectedIds.includes(u.id)))}
              disabled={!selectedIds.length}
              className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2.5 py-1.5 text-[#BFDBFE] disabled:opacity-40"
            >
              Export selected
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedIds.length) return;
                setDangerModal({ kind: "bulk-delete", ids: [...selectedIds], count: selectedIds.length });
              }}
              disabled={!selectedIds.length}
              className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/10 px-2.5 py-1.5 text-[#FDBA74] disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95 shadow-[0_0_24px_rgba(59,130,246,0.06)]">
          {toolbarLoading && users.length === 0 ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, idx) => (
                <div key={`sk-${idx}`} className="h-12 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="p-6">
              <EmptyState
                title="No identities in catalogue"
                description="Provision your first telecom operator or SSO-linked principal."
                action={
                  <button
                    type="button"
                    onClick={openCreateDrawer}
                    className="rounded-lg bg-[#3B82F6]/20 px-4 py-2 text-sm text-[#BFDBFE]"
                  >
                    Add User
                  </button>
                }
              />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#9CA3AF]">
              No users match filters. Adjust search or facets.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-[#0F172A]">
                    <tr className="text-left text-xs uppercase tracking-wide text-[#9CA3AF]">
                      <th className="px-4 py-3">
                        <input
                          ref={headerSelectRef}
                          type="checkbox"
                          aria-label="Select all on this page"
                          checked={pageFullySelected}
                          onChange={() => {
                            if (pageFullySelected) {
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
                        <button type="button" onClick={() => setSort("name")} className="inline-flex items-center gap-1">
                          Name <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        </button>
                      </th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("role")} className="inline-flex items-center gap-1">
                          Role <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("status")} className="inline-flex items-center gap-1">
                          Status <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button type="button" onClick={() => setSort("lastLogin")} className="inline-flex items-center gap-1">
                          Last Login <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        </button>
                      </th>
                      <th className="px-4 py-3">Trusted Devices</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => setDetailId(user.id)}
                        className="group cursor-pointer border-t border-white/5 text-sm text-[#E5E7EB] transition hover:bg-[#1A2436]/70"
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(user.id)
                                  ? prev.filter((id) => id !== user.id)
                                  : [...prev, user.id],
                              )
                            }
                            className="h-4 w-4 rounded border-white/20 bg-[#0B1220]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6]/20 font-medium text-[#BFDBFE]">
                            {getInitials(user.name)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{sanitizePlainText(user.name, 220)}</td>
                        <td className="px-4 py-3 text-[#C7D2FE]">{sanitizePlainText(user.email, 254)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${roleClass(user.role)}`}>
                            {sanitizePlainText(user.role, 40)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(user.status)}`}>
                            {sanitizePlainText(user.status, 40)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#93C5FD]">{sanitizePlainText(user.lastLogin, 40)}</td>
                        <td className="px-4 py-3">{sanitizePlainText(user.devices, 8)}</td>
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
                                    {sanitizePlainText(action.label, 120)}
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
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#9CA3AF]">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
                  {filteredRows.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Profile Panel */}
        <AnimatePresence>
          {mergedDetail && (
            <>
              <motion.button
                type="button"
                aria-label="Close profile"
                onClick={() => setDetailId(null)}
                className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
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
                    <button
                      type="button"
                      onClick={() => setDetailId(null)}
                      className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  {profileLoading ? (
                    <p className="text-xs text-[#64748b]">Loading northbound enrichment…</p>
                  ) : null}
                  <div className="rounded-xl border border-[#3B82F6]/25 bg-gradient-to-br from-[#172554]/55 via-[#1E293B]/70 to-[#111827]/80 p-3 shadow-[0_0_24px_rgba(59,130,246,0.16)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/20 text-lg font-semibold text-[#BFDBFE] shadow-[0_0_18px_rgba(59,130,246,0.3)]">
                        {getInitials(mergedDetail.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {sanitizePlainText(mergedDetail.name, 220)}
                          {mergedDetail.role === "Admin" ? (
                            <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-[#6EE7B7]" />
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-[#93C5FD]">{sanitizePlainText(mergedDetail.email, 254)}</div>
                        <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          Session: {mergedDetail.sessionActive === false ? "Revoked" : "Active"} (simulated)
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] ${roleClass(mergedDetail.role)}`}>
                            {sanitizePlainText(mergedDetail.role, 40)}
                          </span>
                          <span
                            className={`rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] ${statusClass(mergedDetail.status)}`}
                          >
                            {sanitizePlainText(mergedDetail.status, 40)}
                          </span>
                          {mergedDetail.soarSandboxIsolated ? (
                            <span className="rounded-full border border-[#F97316]/40 bg-[#F97316]/15 px-2.5 py-0.5 text-[10px] font-medium text-[#FDBA74]">
                              SOAR egress isolate
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <SecurityRing score={displayScore} />
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
                          <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                            <div className="text-[#9CA3AF]">Upload Count</div>
                            <div className="mt-1 text-sm font-semibold text-white">{mergedDetail.uploads}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                            <div className="text-[#9CA3AF]">Security score</div>
                            <div className="mt-1 text-sm font-semibold text-[#BFDBFE]">{displayScore}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                            <div className="text-[#9CA3AF]">Trusted Devices</div>
                            <div className="mt-1 text-sm font-semibold text-white">{sanitizePlainText(mergedDetail.devices, 8)}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                            <div className="text-[#9CA3AF]">Last Login</div>
                            <div className="mt-1 text-sm font-semibold text-[#93C5FD]">
                              {sanitizePlainText(mergedDetail.lastLogin, 40)}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-3 text-xs leading-relaxed text-[#C7D2FE]">
                          {sanitizePlainText(mergedDetail.name, 220)} — posture score derived from failed logins, suspension
                          state, IP diversity, and upload volume (telecom IAM telemetry).
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
                          <div className="flex items-center justify-between">
                            <span className="text-[#9CA3AF]">Risk Score</span>
                            <span className="font-semibold text-[#A7F3D0]">{displayScore}</span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[#9CA3AF]">Known IPs</span>
                            <div className="flex flex-wrap justify-end gap-1">
                              {(mergedDetail.ips ?? []).map((ip) => (
                                <span
                                  key={sanitizePlainText(ip, 64)}
                                  className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] text-[#BFDBFE]"
                                >
                                  {sanitizePlainText(ip, 45)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#9CA3AF]">Failed Attempts</span>
                            <span className="rounded-full bg-[#EF4444]/20 px-2 py-0.5 text-[10px] text-[#FCA5A5]">
                              {mergedDetail.failedLogins}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[#9CA3AF]">Locations</span>
                            <div className="flex flex-wrap justify-end gap-1">
                              {(mergedDetail.locations ?? []).map((location) => (
                                <span
                                  key={sanitizePlainText(location, 140)}
                                  className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-[#D1D5DB]"
                                >
                                  {sanitizePlainText(location, 120)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
                          <div className="mb-2 text-[11px] uppercase tracking-wide text-[#9CA3AF]">Login Trend</div>
                          <div className="flex h-16 items-end gap-1">
                            {securityTrend.map((value, idx) => (
                              <div key={`trend-${String(idx)}`} className="flex-1 rounded-sm bg-[#3B82F6]/20">
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
                      <motion.section key="devices" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="space-y-2.5">
                          {detailDevices.map((device) => {
                            const Icon = device.icon;
                            return (
                              <div
                                key={device.id}
                                className="rounded-lg border border-white/10 bg-[#111827]/65 p-3 text-xs transition hover:border-[#3B82F6]/30"
                              >
                                <div className="mb-1.5 flex items-start justify-between">
                                  <div className="inline-flex items-center gap-2 text-sm text-white">
                                    <Icon className="h-4 w-4 text-[#93C5FD]" />
                                    {device.label}
                                  </div>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                                      device.trusted ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#EF4444]/20 text-[#FCA5A5]"
                                    }`}
                                  >
                                    {device.trusted ? "Trusted" : "Review"}
                                  </span>
                                </div>
                                <div className="text-[#9CA3AF]">Last active: {device.lastActive}</div>
                                <div className="text-[#9CA3AF]">Endpoint: {sanitizePlainText(device.ip, 120)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.section>
                    )}
                    {detailTab === "Activity" && (
                      <motion.section key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        {(activityItems.length ? activityItems : []).map((item) => {
                          const Icon = ACTIVITY_ICONS[item.iconKey] ?? Activity;
                          return (
                            <div key={item.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-[#111827]/65 p-2.5 text-xs">
                              <span className="mt-0.5 text-[#93C5FD]">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="flex-1 text-[#D1D5DB]">{sanitizePlainText(item.title, 400)}</span>
                              <span className="shrink-0 text-[#9CA3AF]">{sanitizePlainText(item.time ?? "", 48)}</span>
                            </div>
                          );
                        })}
                      </motion.section>
                    )}
                  </AnimatePresence>
                </div>
                <div className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-white/10 bg-[#0F172A]/95 px-4 py-3 shadow-[0_-10px_20px_rgba(2,6,23,0.45)] backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setDangerModal({ kind: "single-suspend", id: mergedDetail.id, label: mergedDetail.name })}
                    className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/15 px-2 py-2 text-xs text-[#FCA5A5] transition hover:bg-[#EF4444]/25"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast("Password reset envelope queued")}
                    className="rounded-lg border border-white/20 bg-white/5 px-2 py-2 text-xs text-[#D1D5DB] transition hover:border-[#3B82F6]/30 hover:text-[#BFDBFE]"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast("Session control: revoke ticket (simulated)")}
                    className="rounded-lg border border-[#F59E0B]/35 bg-[#F59E0B]/15 px-2 py-2 text-xs text-[#FDE68A] transition hover:bg-[#F59E0B]/25"
                  >
                    Force Logout
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Add / Edit drawer */}
        <AnimatePresence>
          {drawerMode && (
            <>
              <motion.button
                type="button"
                onClick={closeFormDrawer}
                className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.aside
                initial={{ x: "100%", opacity: 0.94 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0.9 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.14)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <h3 className="text-base font-semibold text-[#E5E7EB]">
                    {drawerMode === "edit" ? "Edit User" : "Add User"}
                  </h3>
                  <button
                    type="button"
                    onClick={closeFormDrawer}
                    className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                  <div className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/20 text-sm font-semibold text-[#BFDBFE]">
                      {getInitials(form.fullName || "NN")}
                    </div>
                    <div>
                      <div className="text-xs text-[#9CA3AF]">Avatar Preview</div>
                      <div className="text-sm text-[#E5E7EB]">{sanitizePlainText(form.fullName || "New User", 220)}</div>
                    </div>
                  </div>

                  {!canManageRoles ? (
                    <p className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-xs text-[#FDE68A]">
                      Your session may only provision standard subscriber accounts (role locked to User).
                    </p>
                  ) : null}

                  <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                    <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Profile</h4>
                    <FloatingInput
                      label="Full Name"
                      maxLength={200}
                      value={form.fullName}
                      onChange={(e) => {
                        const v = sanitizePlainText(e.target.value, 200);
                        setForm((p) => ({ ...p, fullName: v }));
                        setHasUnsavedChanges(true);
                        if (touched.fullName || submitAttempted) blurValidate("fullName", { fullName: v });
                      }}
                      onBlur={() => {
                        markTouched("fullName");
                        blurValidate("fullName");
                      }}
                      error={(touched.fullName || submitAttempted) && formErrors.fullName}
                    />
                    <div className="mt-3">
                      <FloatingInput
                        label="Email"
                        type="email"
                        maxLength={254}
                        value={form.email}
                        onChange={(e) => {
                          const v = sanitizePlainText(e.target.value, 254);
                          setForm((p) => ({ ...p, email: v }));
                          setHasUnsavedChanges(true);
                          if (touched.email || submitAttempted) blurValidate("email", { email: v });
                        }}
                        onBlur={() => {
                          markTouched("email");
                          blurValidate("email");
                        }}
                        error={(touched.email || submitAttempted) && formErrors.email}
                        hint="Corporate email recommended (SSO alignment)."
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                    <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Access</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {["Admin", "User", "Analyst", "Viewer"].map((role) => {
                        const locked = !canManageRoles && role !== "User";
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={locked}
                            title={locked ? "Administrator role required" : undefined}
                            onClick={() => {
                              if (locked) return;
                              setForm((prev) => ({ ...prev, role }));
                              setHasUnsavedChanges(true);
                              if (touched.role || submitAttempted) {
                                blurValidate("role", { role });
                              }
                            }}
                            className={`rounded-lg border px-2 py-2 text-xs transition ${
                              form.role === role
                                ? "border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#BFDBFE]"
                                : "border-white/10 bg-[#0B1220] text-[#9CA3AF] hover:border-white/20"
                            } ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                    {(touched.role || submitAttempted) && formErrors.role ? (
                      <p className="mt-2 text-xs text-[#FCA5A5]" role="alert">
                        {formErrors.role}
                      </p>
                    ) : null}
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
                              if (touched.status || submitAttempted) blurValidate("status", { status });
                            }}
                            className={`rounded-md px-2 py-1.5 text-xs transition ${
                              form.status === status ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "text-[#9CA3AF] hover:bg-white/5"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(touched.status || submitAttempted) && formErrors.status ? (
                      <p className="mt-2 text-xs text-[#FCA5A5]">{formErrors.status}</p>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                    <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Security</h4>
                    <label className="block text-[#D1D5DB]">
                      Password {drawerMode === "edit" ? <span className="text-[#64748b]">(optional)</span> : null}
                      <div
                        className={`mt-1 flex gap-2 rounded-xl border ${focusedField === "password" ? "border-[#3B82F6]/50 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" : "border-white/10"} bg-[#0B1220] p-1`}
                      >
                        <input
                          value={form.password}
                          type="password"
                          autoComplete="new-password"
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => {
                            setFocusedField("");
                            markTouched("password");
                            blurValidate("password");
                          }}
                          onChange={(e) => {
                            const v = e.target.value.slice(0, 256);
                            setForm((prev) => ({ ...prev, password: v }));
                            setHasUnsavedChanges(true);
                            if (touched.password || submitAttempted) blurValidate("password", { password: v });
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-[#E5E7EB] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = generateSecurePassword();
                            setForm((prev) => ({ ...prev, password: next }));
                            setHasUnsavedChanges(true);
                            markTouched("password");
                            blurValidate("password", { password: next });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 text-xs text-[#BFDBFE] transition active:scale-[0.98]"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Generate
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-[#64748b]">
                        Min 10 chars, upper, lower, digit, symbol (telecom baseline).
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full transition-all ${formStrength <= 1 ? "bg-[#EF4444]" : formStrength <= 2 ? "bg-[#F59E0B]" : formStrength <= 3 ? "bg-[#3B82F6]" : "bg-[#10B981]"}`}
                          style={{ width: `${(formStrength / 5) * 100}%` }}
                        />
                      </div>
                      {(touched.password || submitAttempted) && formErrors.password ? (
                        <span className="mt-1 block text-xs text-[#FCA5A5]">{formErrors.password}</span>
                      ) : null}
                    </label>
                    <div className="mt-3">
                      <label className="block text-[#D1D5DB]">Allowed Devices</label>
                      <div className="mt-1 inline-flex items-center rounded-lg border border-white/10 bg-[#0B1220]">
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(1, Number(form.allowedDevices || 1) - 1);
                            setForm((prev) => ({ ...prev, allowedDevices: String(next) }));
                            setHasUnsavedChanges(true);
                            if (touched.allowedDevices || submitAttempted) blurValidate("allowedDevices", { allowedDevices: String(next) });
                          }}
                          className="px-2 py-1.5 text-[#9CA3AF] hover:bg-white/5"
                        >
                          -
                        </button>
                        <span className="min-w-10 px-2 text-center text-[#E5E7EB]">{form.allowedDevices}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Number(form.allowedDevices || 1) + 1;
                            const v = String(Math.min(99, next));
                            setForm((prev) => ({ ...prev, allowedDevices: v }));
                            setHasUnsavedChanges(true);
                            if (touched.allowedDevices || submitAttempted)
                              blurValidate("allowedDevices", { allowedDevices: v });
                          }}
                          className="px-2 py-1.5 text-[#9CA3AF] hover:bg-white/5"
                        >
                          +
                        </button>
                      </div>
                      {(touched.allowedDevices || submitAttempted) && formErrors.allowedDevices ? (
                        <span className="mt-1 block text-xs text-[#FCA5A5]">{formErrors.allowedDevices}</span>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                    <h4 className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">Preferences</h4>
                    <label className="block text-[#D1D5DB]">
                      Notes
                      <textarea
                        value={form.notes}
                        maxLength={2000}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, notes: sanitizePlainText(e.target.value, 2000) }));
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
                    <button
                      type="button"
                      onClick={closeFormDrawer}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB] transition active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitForm()}
                      disabled={submitting}
                      className="rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/20 px-3 py-2 text-sm text-[#BFDBFE] shadow-[0_0_16px_rgba(59,130,246,0.24)] transition hover:bg-[#3B82F6]/30 active:scale-[0.98] disabled:opacity-60"
                    >
                      {submitting ? "Saving…" : drawerMode === "edit" ? "Save Changes" : "Create User"}
                    </button>
                  </div>
                  {hasUnsavedChanges && !submitting ? (
                    <p className="mt-2 text-xs text-[#FDE68A]">You have unsaved changes.</p>
                  ) : null}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Unsaved form confirm */}
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
                <p className="mt-1 text-xs text-[#9CA3AF]">Closing now loses pending IAM edits.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnsavedConfirm(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#D1D5DB]"
                  >
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

        {/* Danger confirmations */}
        <AnimatePresence>
          {dangerModal && (
            <>
              <motion.button
                type="button"
                className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={() => setDangerModal(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed left-1/2 top-1/2 z-[96] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0F172A] p-5 shadow-2xl"
              >
                <h4 className="text-base font-semibold text-[#FCA5A5]">
                  {dangerModal.kind.startsWith("bulk") ? "Confirm bulk IAM action" : "Confirm IAM action"}
                </h4>
                <p className="mt-2 text-sm text-[#CBD5F5]">
                  {dangerModal.kind === "bulk-delete" && (
                    <>
                      Permanently delete <strong>{dangerModal.count}</strong> principals? This simulates irrevocable SSO
                      unlink.
                    </>
                  )}
                  {dangerModal.kind === "bulk-suspend" && (
                    <>
                      Suspend <strong>{dangerModal.count}</strong> accounts? Access tokens will be invalidated on next SSO
                      check.
                    </>
                  )}
                  {dangerModal.kind === "bulk-activate" && (
                    <>Re-enable <strong>{dangerModal.count}</strong> principals?</>
                  )}
                  {dangerModal.kind === "single-delete" && <>Delete principal {sanitizePlainText(dangerModal.label, 220)}?</>}
                  {dangerModal.kind === "single-suspend" && <>Suspend {sanitizePlainText(dangerModal.label, 220)}?</>}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#CBD5F5]" onClick={() => setDangerModal(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#B91C1C]"
                    onClick={async () => {
                      try {
                        if (dangerModal.kind === "bulk-delete") {
                          await bulkDelete(dangerModal.ids);
                          pushToast(`${dangerModal.ids.length} users deleted`);
                        }
                        if (dangerModal.kind === "bulk-suspend") {
                          await bulkSetStatus(dangerModal.ids, "Suspended");
                          pushToast("Selected users suspended");
                        }
                        if (dangerModal.kind === "bulk-activate") {
                          await bulkSetStatus(dangerModal.ids, "Active");
                          pushToast("Selected users activated");
                        }
                        if (dangerModal.kind === "single-delete") {
                          await runSingleDelete(dangerModal.id);
                        }
                        if (dangerModal.kind === "single-suspend") {
                          await updateUser(dangerModal.id, { status: "Suspended" });
                          pushToast("User suspended");
                        }
                        setSelectedIds([]);
                        setDangerModal(null);
                      } catch (err) {
                        pushToast(normalizeSocError(err).message ?? "Action declined by IAM policy gateway");
                      }
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">Recent directory signals</h3>
          <div className="space-y-3">
            {users.slice(0, 5).map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0F172A]/70 px-3 py-3 transition hover:border-[#3B82F6]/30"
              >
                <div className="mt-0.5 rounded-md bg-white/5 p-1.5 text-[#93C5FD]">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm text-[#D1D5DB]">
                  {sanitizePlainText(u.email, 254)}
                  <span className="mx-2 text-[#475569]">·</span>
                  <span className="text-[#94A3B8]">{sanitizePlainText(u.role, 32)}</span>
                  <span className="mx-2 text-[#475569]">·</span>
                  <span className="text-[#94A3B8]">{sanitizePlainText(u.status, 32)}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {sanitizePlainText(u.lastLogin, 48)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role="status"
              className="rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_14px_rgba(59,130,246,0.2)]"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
