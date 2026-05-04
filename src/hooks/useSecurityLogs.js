import { useCallback, useEffect, useState } from "react";
import { fetchSecurityLogs } from "@/services/data/logsApi";

/**
 * Async audit log feed with stable reload contract for SOC-style consoles.
 */
export function useSecurityLogs() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const bundle = await fetchSecurityLogs({});
      setItems(bundle.items ?? []);
      setStatus("ready");
    } catch (err) {
      setError(err?.message ?? "Could not retrieve security logs.");
      setItems([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, status, error, reload };
}
