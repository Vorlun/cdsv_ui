import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@/services/query/reactQueryLite";
import { getSocUploadTelemetry } from "@/services/api";
import { useTelemetryFeed } from "@/hooks/useTelemetryFeed";
import {
  applyUploadTelemetryEvent,
  normalizeUploadTelemetryRows,
} from "@/features/dashboard/telemetry/uploadTelemetryTransformer";

function rowsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((row, idx) => {
    const other = b[idx];
    return (
      row.timestamp === other?.timestamp &&
      row.uploads === other?.uploads &&
      row.encrypted === other?.encrypted &&
      row.verified === other?.verified &&
      row.scanned === other?.scanned &&
      row.suspicious === other?.suspicious &&
      row.blocked === other?.blocked
    );
  });
}

function mergeState(prev, next) {
  if (prev.connected === next.connected && prev.lastSyncAt === next.lastSyncAt) return prev;
  return next;
}

export function useRealtimeUploadTelemetry(seedRows, queryScope = "default") {
  const [rows, setRows] = useState(() => normalizeUploadTelemetryRows(seedRows));
  const lastEventAtRef = useRef(0);
  const [state, setState] = useState({
    connected: true,
    lastSyncAt: null,
  });

  const telemetryQuery = useQuery({
    queryKey: ["soc-upload-telemetry-v2", queryScope],
    queryFn: async () => {
      const result = await getSocUploadTelemetry();
      return normalizeUploadTelemetryRows(result);
    },
    refetchInterval: 4000,
  });

  useEffect(() => {
    const queryRows = Array.isArray(telemetryQuery.data) ? telemetryQuery.data : [];
    if (queryRows.length) {
      setRows((prev) => (rowsEqual(prev, queryRows) ? prev : queryRows));
      setState((prev) => mergeState(prev, { ...prev, lastSyncAt: new Date().toISOString() }));
      return;
    }
    const normalizedSeed = normalizeUploadTelemetryRows(seedRows);
    if (normalizedSeed.length) {
      setRows((prev) => (rowsEqual(prev, normalizedSeed) ? prev : normalizedSeed));
    }
  }, [seedRows, telemetryQuery.data]);

  useTelemetryFeed((event) => {
    if (!event) return;
    if (event._channel === "disconnect") {
      setState((prev) => mergeState(prev, { ...prev, connected: false }));
      return;
    }
    if (event._channel === "overview") {
      const normalized = normalizeUploadTelemetryRows(event.uploadsTimeline);
      if (normalized.length) {
        setRows((prev) => (rowsEqual(prev, normalized) ? prev : normalized));
        setState((prev) =>
          mergeState(prev, { connected: true, lastSyncAt: event.telemetrySyncAt ?? new Date().toISOString() }),
        );
      }
      return;
    }
    if (event._channel !== "event") return;
    const now = Date.now();
    if (now - lastEventAtRef.current < 220) return; // prevent render storms
    lastEventAtRef.current = now;
    const type = String(event.type ?? "").toLowerCase();
    if (
      !type.includes("upload") &&
      !type.includes("encryption") &&
      !type.includes("integrity") &&
      !type.includes("malware")
    ) {
      return;
    }
    setRows((prev) => applyUploadTelemetryEvent(prev, event));
    setState((prev) =>
      mergeState(prev, { ...prev, connected: true, lastSyncAt: event.createdAt ?? new Date().toISOString() }),
    );
  });

  const hasSignal = useMemo(
    () => rows.some((row) => row.uploads > 0 || row.encrypted > 0 || row.verified > 0 || row.blocked > 0),
    [rows],
  );

  return {
    rows,
    hasSignal,
    connected: state.connected,
    lastSyncAt: state.lastSyncAt,
    refetch: telemetryQuery.refetch,
    isFetching: telemetryQuery.isLoading,
  };
}
