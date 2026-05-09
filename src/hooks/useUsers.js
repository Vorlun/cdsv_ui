import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

const ROLE_TITLE = Object.freeze({
  admin: "Admin",
  analyst: "Analyst",
  user: "User",
  viewer: "Viewer",
});

const STATUS_TITLE = Object.freeze({
  active: "Active",
  suspended: "Suspended",
});

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function normalizeUserRow(u) {
  const r = String(u.role ?? "user").toLowerCase();
  const s = String(u.status ?? "active").toLowerCase();
  const suspicious = Number(u.suspiciousSessionCount ?? 0);
  const deviceCount = u.deviceCount != null ? Number(u.deviceCount) : null;
  let devices = "—";
  if (deviceCount != null && !Number.isNaN(deviceCount)) {
    devices = suspicious > 0 ? `${deviceCount} · ${suspicious} alert` : String(deviceCount);
  }

  return {
    ...u,
    name: u.fullName ?? u.name ?? "",
    role: ROLE_TITLE[r] ?? u.role,
    status: STATUS_TITLE[s] ?? u.status,
    joined: u.createdAt ?? u.joined,
    lastLogin: formatDt(u.lastLoginAt) !== "—" ? formatDt(u.lastLoginAt) : formatDt(u.lastActivity),
    lastActivityRaw: u.lastActivity ?? u.lastLoginAt,
    devices,
    deviceCount,
    suspiciousSessionCount: suspicious,
    uploads: u.uploadCount ?? u.uploads ?? 0,
    department: u.department ?? "",
    notes: u.notes ?? "",
  };
}

function mapRoleFilter(roleFilter) {
  if (!roleFilter || roleFilter === "All Roles") return "";
  return String(roleFilter).toLowerCase();
}

function mapStatusFilter(statusFilter) {
  if (!statusFilter || statusFilter === "All") return "";
  return String(statusFilter).toLowerCase();
}

function mapRoleToApi(roleLabel) {
  return String(roleLabel ?? "user").toLowerCase();
}

function mapSortKey(sortBy) {
  const k = String(sortBy ?? "name").toLowerCase();
  if (k === "name") return "fullname";
  if (k === "lastlogin") return "lastactivity";
  return k;
}

/**
 * Admin IAM catalogue backed by Nest `/users` APIs (admin JWT required).
 */
export function useUsers() {
  const { role } = useAuthSession();
  const callerRole = role ?? "user";

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    sort: "created",
    sortDir: "desc",
  });

  const reload = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent);
      if (!silent) {
        setStatus("loading");
        setError(null);
      }
      try {
        const bundle = await socApi.usersList({
          search: filters.search || undefined,
          role: filters.role || undefined,
          status: filters.status || undefined,
          sort: filters.sort,
          sortDir: filters.sortDir,
          page,
          pageSize,
        });
        const rows = Array.isArray(bundle?.data) ? bundle.data : [];
        setUsers(rows.map((u) => normalizeUserRow(u)));
        setTotal(typeof bundle?.total === "number" ? bundle.total : rows.length);
        setError(null);
        if (!silent) setStatus("ready");
      } catch (err) {
        const { message } = normalizeSocError(err);
        if (silent) return;
        setUsers([]);
        setTotal(0);
        setError(message);
        setStatus("error");
      }
    },
    [filters, page, pageSize],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyDirectoryFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const createUser = useCallback(
    async (payload) => {
      const body = {
        email: payload.email?.trim(),
        fullName: payload.fullName?.trim(),
        password: payload.password,
        role: mapRoleToApi(payload.role),
        department: payload.department?.trim() || undefined,
      };
      const res = await socApi.createUser(body);
      const row = res?.id ? res : res?.data ?? res;
      const nu = row?.id ? normalizeUserRow(row) : null;
      await reload({ silent: true });
      return nu;
    },
    [reload],
  );

  const updateUser = useCallback(
    async (userId, patch) => {
      const body = {};
      if (patch.fullName != null) body.fullName = patch.fullName;
      if (patch.email != null) body.email = patch.email;
      if (patch.role != null) body.role = mapRoleToApi(patch.role);
      if (patch.status != null) body.status = patch.status;
      if (patch.department != null) body.department = patch.department;
      if (patch.notes != null) body.notes = patch.notes;
      if (patch.avatarUrl != null) body.avatarUrl = patch.avatarUrl;
      if (patch.deviceQuota != null) body.deviceQuota = patch.deviceQuota;
      if (patch.password?.trim()) body.password = patch.password.trim();

      const res = await socApi.updateUser(userId, body);
      const nu = res?.id ? normalizeUserRow(res) : null;
      if (nu?.id) {
        setUsers((prev) => prev.map((x) => (x.id === nu.id ? { ...nu } : x)));
        return nu;
      }
      await reload({ silent: true });
      return null;
    },
    [reload],
  );

  const deleteUser = useCallback(
    async (userId) => {
      await socApi.deleteUser(userId);
      setUsers((prev) => prev.filter((x) => x.id !== userId));
      await reload({ silent: true });
    },
    [reload],
  );

  const bulkSetStatus = useCallback(
    async (ids, nextStatus) => {
      await Promise.all(ids.map((id) => socApi.updateUser(id, { status: nextStatus })));
      await reload({ silent: true });
    },
    [reload],
  );

  const bulkDelete = useCallback(
    async (ids) => {
      await Promise.all(ids.map((id) => socApi.deleteUser(id)));
      setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
      await reload({ silent: true });
    },
    [reload],
  );

  const fetchProfile = useCallback(async (userId) => {
    const raw = await socApi.userProfile(userId);
    if (!raw?.id) return null;

    const r = String(raw.role ?? "user").toLowerCase();
    const s = String(raw.status ?? "active").toLowerCase();
    const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];

    return {
      ...raw,
      name: raw.fullName ?? raw.name ?? "",
      role: ROLE_TITLE[r] ?? raw.role,
      status: STATUS_TITLE[s] ?? raw.status,
      uploads: raw.uploadCount ?? raw.uploads ?? 0,
      devices: sessions.length ? String(sessions.length) : String(raw.deviceCount ?? "0"),
      lastLogin: formatDt(raw.lastLoginAt) !== "—" ? formatDt(raw.lastLoginAt) : formatDt(raw.lastActivity),
      failedLogins: raw.failedLogins ?? 0,
      ips: raw.ips ?? [],
      locations: raw.locations ?? [],
      activity: Array.isArray(raw.activityPreview)
        ? raw.activityPreview.map((a) => ({
            id: a.id,
            iconKey: a.iconKey ?? "activity",
            title: a.title ?? "",
            time: formatDt(a.time ?? a.createdAt),
          }))
        : [],
      riskSeries: raw.riskSeries,
      soarSandboxIsolated: raw.soarSandboxIsolated,
      detailSessions: sessions,
    };
  }, []);

  const fetchUserActivity = useCallback(async (userId) => {
    return socApi.userActivity(userId);
  }, []);

  const fetchUserFiles = useCallback(async (userId) => {
    return socApi.userFiles(userId);
  }, []);

  const resetPassword = useCallback(
    async (userId, newPassword) => {
      await socApi.resetUserPassword(userId, { newPassword });
      await reload({ silent: true });
    },
    [reload],
  );

  const revokeSessions = useCallback(
    async (userId) => {
      await socApi.revokeUserSessions(userId);
      await reload({ silent: true });
    },
    [reload],
  );

  const fetchDirectorySignals = useCallback(async () => {
    const bundle = await socApi.usersDirectorySignals();
    return Array.isArray(bundle?.items) ? bundle.items : [];
  }, []);

  const isEmpty = useMemo(() => status === "ready" && users.length === 0 && total === 0, [status, users.length, total]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    users,
    total,
    page,
    pageSize,
    pageCount,
    setPage,
    filters,
    applyDirectoryFilters,
    mapSortKey,
    mapRoleFilter,
    mapStatusFilter,
    status,
    error,
    reload,
    isEmpty,
    callerRole,
    createUser,
    updateUser,
    deleteUser,
    bulkSetStatus,
    bulkDelete,
    fetchProfile,
    fetchUserActivity,
    fetchUserFiles,
    resetPassword,
    revokeSessions,
    fetchDirectorySignals,
    retry: () => void reload(),
  };
}
