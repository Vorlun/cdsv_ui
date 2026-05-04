import { useCallback, useEffect, useState } from "react";

const TYPES = ["upload", "scan", "download", "review", "login"];
const FILES = [
  "edge_config.yaml",
  "latency_sample.csv",
  "handover_bundle.zip",
  "tenant_export.ndjson",
  "playbook_v2.pdf",
];

function makeSyntheticRow(seedOffset) {
  const type = TYPES[(Date.now() + seedOffset) % TYPES.length];
  const file = type === "login" ? "—" : FILES[(seedOffset + Date.now()) % FILES.length];
  return {
    id: `live-${Date.now()}-${seedOffset}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    file,
    at: new Date().toISOString(),
  };
}

/**
 * Appends a synthetic event every 5–8s, max 5 items. Resets when `source` changes.
 */
export function useSimulatedRecentActivity(source, { enabled, maxItems = 5 } = {}) {
  const [rows, setRows] = useState(source);

  useEffect(() => {
    setRows(source);
  }, [source]);

  const reset = useCallback(() => {
    setRows(source);
  }, [source]);

  useEffect(() => {
    if (!enabled || !Array.isArray(source) || source.length === 0) return undefined;

    let cancelled = false;
    let timeoutId;

    const schedule = (offset = 0) => {
      const delay = 5000 + Math.random() * 3000;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setRows((prev) => {
          const base = prev?.length ? prev : source;
          const next = [makeSyntheticRow(offset), ...base].slice(0, maxItems);
          return next;
        });
        schedule(offset + 1);
      }, delay);
    };

    schedule(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [enabled, source, maxItems]);

  return { rows, reset };
}
