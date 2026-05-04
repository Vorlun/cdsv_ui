import { useCallback, useEffect, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

/**
 * Telecom SOAR dashboard: GET /soar/snapshot + SOC stream fan-out (same `liveLogs` as SIEM Logs).
 */
export function useSoarIncidentCenter(options = {}) {
  const streamIntervalMs = options.streamIntervalMs ?? 5500;
  const socRole = options.socRole ?? "";

  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(() => ({}));

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const s = await socApi.soarSnapshot();
      setSnapshot(s);
      setStatus("ready");
    } catch (err) {
      setSnapshot(null);
      setError(normalizeSocError(err).message ?? "SOAR gateway unavailable.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const off = subscribeSocStream((pulse) => {
      if (pulse.soarSnapshot) setSnapshot(pulse.soarSnapshot);
    }, streamIntervalMs);
    return off;
  }, [status, streamIntervalMs]);

  const runAction = useCallback(async (incidentId, action, actor, extras = {}) => {
    const key = `${incidentId}-${action}`;
    setActionBusy((p) => ({ ...p, [key]: true }));
    try {
      const res = await socApi.soarAction({ incidentId, action, actor, socRole, ...extras });
      const nextSnap = res.snapshot ?? null;
      if (nextSnap) setSnapshot(nextSnap);
      return { ok: true, snapshot: nextSnap };
    } catch (err) {
      return { ok: false, message: normalizeSocError(err).message ?? "Action failed." };
    } finally {
      setActionBusy((p) => ({ ...p, [key]: false }));
    }
  }, [socRole]);

  return {
    snapshot,
    status,
    error,
    actionBusy,
    reload: load,
    retry: () => void load(),
    runAction,
  };
}
