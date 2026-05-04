import { useCallback, useEffect, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

/**
 * Loads {@link SECURITY_GOVERNANCE_DEFAULTS}-shaped state from mock gateway + aligns with SSE fan-out.
 */
export function useGovernanceConsole({ streamIntervalMs = 5500 } = {}) {
  const [governance, setGovernance] = useState(null);
  const [audit, setAudit] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, a, o] = await Promise.all([
        socApi.governanceSettings(),
        socApi.governanceAudit(),
        socApi.governanceOutbox(),
      ]);
      setGovernance(g);
      setAudit(Array.isArray(a.items) ? a.items : []);
      setOutbox(Array.isArray(o.items) ? o.items : []);
    } catch (err) {
      setError(normalizeSocError(err).message ?? "Governance unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = subscribeSocStream((pulse) => {
      if (pulse.governance) setGovernance({ ...pulse.governance });
      if (Array.isArray(pulse.governanceNotifications)) {
        setOutbox(pulse.governanceNotifications.map((row) => ({ ...row })));
      }
    }, streamIntervalMs);
    return off;
  }, [streamIntervalMs]);

  return { governance, audit, outbox, loading, error, refresh, setGovernance, setAudit, setOutbox };
}
