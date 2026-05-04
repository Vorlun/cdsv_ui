import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

/**
 * Incident rail sourced from GET /threats with stream mirroring.
 */
export function useThreats(options = {}) {
  const { soundEnabled = false, streamIntervalMs = 5500 } = options;

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const dismissedIds = useRef(new Set());

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const bundle = await socApi.threats();
      const items = Array.isArray(bundle.items) ? bundle.items : [];
      setAlerts(
        items.map((t) => {
          const copy = { ...t };
          if (dismissedIds.current.has(t.id)) copy.dismissed = true;
          return copy;
        }),
      );
      setStatus("ready");
    } catch (err) {
      setAlerts([]);
      const { message } = normalizeSocError(err);
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const off = subscribeSocStream((pulse) => {
      setAlerts((prev) => {
        const merged = pulse.threats.map((t) => {
          const copy = { ...t };
          if (dismissedIds.current.has(t.id)) copy.dismissed = true;
          return copy;
        });
        const prevLead = prev.find((x) => !x.dismissed)?.id ?? prev[0]?.id;
        const nextLead =
          merged.find((x) => !x.dismissed)?.id ??
          merged[0]?.id ??
          null;
        if (
          soundEnabled &&
          nextLead != null &&
          nextLead !== prevLead
        ) {
          window.navigator.vibrate?.(120);
        }
        return merged;
      });
    }, streamIntervalMs);
    return off;
  }, [status, soundEnabled, streamIntervalMs]);

  const dismissThreat = useCallback((id) => {
    dismissedIds.current.add(id);
    setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, dismissed: true } : item)));
  }, []);

  const visibleAlerts = useMemo(() => alerts.filter((item) => !item.dismissed), [alerts]);

  const retry = useCallback(() => void reload(), [reload]);

  return {
    status,
    error,
    alerts,
    visibleAlerts,
    dismissThreat,
    reload,
    retry,
    isEmpty: status === "ready" && visibleAlerts.length === 0,
  };
}
