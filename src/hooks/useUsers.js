import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

/**
 * Enterprise IAM catalogue state (mock northbound CRUD backed by simulated API).
 */
export function useUsers() {
  const { role } = useAuthSession();
  const callerRole = role ?? "user";

  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const reload = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) {
      setStatus("loading");
      setError(null);
    }
    try {
      const bundle = await socApi.usersList();
      const rows = Array.isArray(bundle.items) ? bundle.items : [];
      setUsers(rows.map((u) => ({ ...u })));
      setError(null);
      if (!silent) setStatus("ready");
    } catch (err) {
      const { message } = normalizeSocError(err);
      if (silent) {
        return;
      }
      setUsers([]);
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createUser = useCallback(
    async (payload) => {
      const body = { ...payload, callerRole };
      const res = await socApi.createUser(body);
      const nu = res?.user;
      if (nu?.id) {
        setUsers((prev) => [{ ...nu }, ...prev.filter((x) => x.id !== nu.id)]);
      } else {
        await reload();
      }
    },
    [callerRole, reload],
  );

  const updateUser = useCallback(async (userId, patch) => {
    const res = await socApi.updateUser(userId, { ...patch, callerRole });
    const nu = res?.user;
    if (nu?.id) {
      setUsers((prev) => prev.map((x) => (x.id === nu.id ? { ...nu } : x)));
      return nu;
    }
    await reload();
    return null;
  }, [callerRole, reload]);

  const deleteUser = useCallback(async (userId) => {
    await socApi.deleteUser(userId, { callerRole });
    setUsers((prev) => prev.filter((x) => x.id !== userId));
  }, [callerRole]);

  const bulkSetStatus = useCallback(
    async (ids, nextStatus) => {
      await Promise.all(ids.map((id) => socApi.updateUser(id, { callerRole, status: nextStatus })));
      await reload({ silent: true });
    },
    [callerRole, reload],
  );

  const bulkDelete = useCallback(
    async (ids) => {
      await Promise.all(ids.map((id) => socApi.deleteUser(id, { callerRole })));
      setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
      await reload({ silent: true });
    },
    [callerRole, reload],
  );

  /** Simulated enrichment for profile pane (northbound latency). */
  const fetchProfile = useCallback(async (userId) => {
    await delayQuiet();
    const bundle = await socApi.userProfile(userId);
    return bundle?.user ?? null;
  }, []);

  const isEmpty = useMemo(() => status === "ready" && users.length === 0, [status, users.length]);

  return {
    users,
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
    retry: () => void reload(),
  };
}

function delayQuiet() {
  return new Promise((r) => window.setTimeout(r, 140 + Math.random() * 120));
}
