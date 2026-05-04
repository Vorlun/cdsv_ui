import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { auditLogsToCsv } from "@/utils/auditLogSchema";
import { filterAuditLogs } from "@/utils/siemAuditFilters";
import { sanitizePlainText } from "@/utils/sanitize";
import { buildCorrelationIndex, sortAuditPriority } from "@/utils/siemLogCorrelation";

function mergeAuditFeed(prev, incoming) {
  const nextEvents = incoming ?? [];
  if (!nextEvents.length) return prev;
  const m = new Map(prev.map((r) => [r.id, r]));
  for (const ev of nextEvents) m.set(ev.id, { ...ev });
  return [...m.values()].sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
}

function pruneSetToIds(set, allowedIds) {
  let changed = false;
  const next = new Set();
  for (const id of set) {
    if (allowedIds.has(id)) next.add(id);
    else changed = true;
  }
  if (!changed && next.size === set.size) return set;
  return next;
}

/**
 * Telecom SIEM-style audit catalogue: GET /logs, streamed ingress via GET /logs/stream,
 * deterministic client filters + authoritative POST /logs/filter for exports.
 */
export function useAuditCenterLogs(options = {}) {
  const streamPollMs = options.streamPollMs ?? 3800;
  const socRole = options.socRole ?? "";
  const actorPrincipal = options.actorPrincipal ?? "";

  const [catalog, setCatalog] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("loading");
  const [fetchError, setFetchError] = useState(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(sanitizePlainText(query, 220), 220);
  const [resultFilter, setResultFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [dateRange, setDateRange] = useState("Today");
  const [liveStream, setLiveStream] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [criticalFlashIds, setCriticalFlashIds] = useState(() => new Set());
  const [burstTicker, setBurstTicker] = useState(0);

  const [incidentIds, setIncidentIds] = useState(() => new Set());
  const [investigationQueue, setInvestigationQueue] = useState(() => []);
  const [analystTrail, setAnalystTrail] = useState(() => []);

  const streamTimerRef = useRef(null);
  const filterCriteriaRef = useRef({});
  const streamBatchRef = useRef(null);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const reload = useCallback(async () => {
    setFetchStatus("loading");
    setFetchError(null);
    try {
      const bundle = await socApi.logs();
      const items = Array.isArray(bundle.items) ? bundle.items.map((x) => ({ ...x })) : [];
      setCatalog(items);
      setFetchStatus("ready");
    } catch (err) {
      setCatalog([]);
      setFetchError(normalizeSocError(err).message ?? "Audit feed unavailable.");
      setFetchStatus("error");
    }
  }, []);

  const refreshAnalystTrail = useCallback(async () => {
    try {
      const bundle = await socApi.analystActions();
      setAnalystTrail(Array.isArray(bundle.items) ? bundle.items : []);
    } catch {
      setAnalystTrail([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (fetchStatus === "ready") void refreshAnalystTrail();
  }, [fetchStatus, refreshAnalystTrail]);

  const filterCriteria = useMemo(
    () => ({
      q: debouncedQuery,
      severity: severityFilter,
      action: actionFilter,
      result: resultFilter,
      dateRange,
    }),
    [debouncedQuery, severityFilter, actionFilter, resultFilter, dateRange],
  );

  filterCriteriaRef.current = filterCriteria;

  const filteredRows = useMemo(
    () => filterAuditLogs(catalog, filterCriteria),
    [catalog, filterCriteria],
  );

  const displayRows = useMemo(() => sortAuditPriority(filteredRows), [filteredRows]);

  const correlation = useMemo(() => buildCorrelationIndex(catalog), [catalog]);

  /** When facets or corpus change, strip highlights/flashes outside the active funnel — keeps stream + filter consistent. */
  useEffect(() => {
    const allowed = new Set(displayRows.map((r) => r.id));
    setHighlightedIds((prev) => pruneSetToIds(prev, allowed));
    setCriticalFlashIds((prev) => pruneSetToIds(prev, allowed));
  }, [displayRows]);

  const pushHighlights = useCallback((ids, snapshot) => {
    if (!ids.length) return;
    const crit = filterCriteriaRef.current;
    const corpus = snapshot ?? catalogRef.current;
    const allowed = new Set(filterAuditLogs(corpus, crit).map((r) => r.id));
    const visible = ids.filter((id) => allowed.has(id));
    if (!visible.length) return;

    setHighlightedIds((prev) => {
      const n = new Set(prev);
      visible.forEach((id) => n.add(id));
      return n;
    });
    window.setTimeout(() => {
      setHighlightedIds((prev) => {
        const n = new Set(prev);
        visible.forEach((id) => n.delete(id));
        return n;
      });
    }, 6500);
  }, []);

  const pushCriticalFlash = useCallback((ids, snapshot) => {
    const crit = filterCriteriaRef.current;
    const corpus = snapshot ?? catalogRef.current;
    const allowed = new Set(filterAuditLogs(corpus, crit).map((r) => r.id));
    const vis = ids.filter((id) => allowed.has(id));
    if (!vis.length) return;

    setCriticalFlashIds((prev) => {
      const n = new Set(prev);
      vis.forEach((id) => n.add(id));
      return n;
    });
    window.setTimeout(() => {
      setCriticalFlashIds((prev) => {
        const n = new Set(prev);
        vis.forEach((id) => n.delete(id));
        return n;
      });
    }, 4200);
  }, []);

  const pollStream = useCallback(async () => {
    try {
      const packet = await socApi.auditLogsStream();
      const events = Array.isArray(packet.events) ? packet.events : [];
      if (!events.length) return false;

      setCatalog((prev) => {
        const next = mergeAuditFeed(prev, events);
        const prevIds = new Set(prev.map((p) => p.id));
        const freshIds = events.filter((e) => !prevIds.has(e.id)).map((e) => e.id);
        streamBatchRef.current = {
          freshIds,
          snapshot: next.map((r) => ({ ...r })),
        };
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  useLayoutEffect(() => {
    const pack = streamBatchRef.current;
    if (!pack) return;
    streamBatchRef.current = null;

    const crit = filterCriteriaRef.current;
    const allowed = new Set(filterAuditLogs(pack.snapshot, crit).map((r) => r.id));
    const visibleFresh = pack.freshIds.filter((id) => allowed.has(id));

    if (visibleFresh.length) {
      pushHighlights(visibleFresh, pack.snapshot);
      setBurstTicker((t) => t + 1);
    }

    const criticalIds = visibleFresh.filter((id) => {
      const row = pack.snapshot.find((r) => r.id === id);
      return row?.severity === "Critical";
    });
    if (criticalIds.length) pushCriticalFlash(criticalIds, pack.snapshot);
  }, [catalog, pushHighlights, pushCriticalFlash]);

  useEffect(() => {
    if (!liveStream || fetchStatus !== "ready") {
      if (streamTimerRef.current != null) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      return undefined;
    }

    streamTimerRef.current = window.setInterval(() => {
      void pollStream();
    }, streamPollMs);

    return () => {
      if (streamTimerRef.current != null) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [liveStream, fetchStatus, pollStream, streamPollMs]);

  const recordAnalystAction = useCallback(
    async (type, log, actorEmail, extra = {}) => {
      await socApi.logAnalystAction({
        type,
        logId: log.id,
        actor: sanitizePlainText(actorEmail, 254),
        socRole,
        targetIp: sanitizePlainText(extra.targetIp ?? log.ip ?? "", 45),
        detail: sanitizePlainText(String(extra.detail ?? ""), 400),
      });
      await refreshAnalystTrail();
    },
    [refreshAnalystTrail, socRole],
  );

  const blockIpForLog = useCallback(
    async (log, actorEmail) => {
      const ip = sanitizePlainText(log.ip ?? "", 45);
      await socApi.blockIp({
        ip,
        actor: sanitizePlainText(actorEmail, 254),
        socRole,
      });
      await recordAnalystAction(
        "block_ip",
        log,
        actorEmail,
        { detail: `Sinkhole policy applied to ${ip}`, targetIp: ip },
      );
    },
    [recordAnalystAction, socRole],
  );

  const markAsIncident = useCallback(
    async (log, actorEmail) => {
      await recordAnalystAction("mark_incident", log, actorEmail, {
        detail: `Formal incident — ${sanitizePlainText(log.action ?? "", 80)}`,
      });
      setIncidentIds((prev) => new Set(prev).add(log.id));
    },
    [recordAnalystAction],
  );

  const addToInvestigation = useCallback(async (log, actorEmail) => {
    await recordAnalystAction("investigate_enqueue", log, actorEmail, {
      detail: `Queued for hunt — ${sanitizePlainText(log.ip ?? "", 45)}`,
    });
    setInvestigationQueue((prev) => (prev.includes(log.id) ? prev : [...prev, log.id]));
  }, [recordAnalystAction]);

  const exportFilteredCsv = useCallback(async () => {
    const crit = {
      q: debouncedQuery,
      severity: severityFilter,
      action: actionFilter,
      result: resultFilter,
      dateRange,
    };
    try {
      const bundle = await socApi.auditLogsFilter(crit);
      const rows = Array.isArray(bundle.items) ? bundle.items : [];
      await socApi.exportLogsAck({
        format: "csv",
        rows,
        facet: "siem_audit_export",
        actor: sanitizePlainText(actorPrincipal, 254),
        socRole,
      });
      const csv = auditLogsToCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siem-audit-${new Date().toISOString().slice(0, 19)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const csv = auditLogsToCsv(filteredRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siem-audit-local-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [
    filteredRows,
    debouncedQuery,
    severityFilter,
    actionFilter,
    resultFilter,
    dateRange,
    actorPrincipal,
    socRole,
  ]);

  const isEmptyFiltered = fetchStatus === "ready" && displayRows.length === 0;

  return {
    catalog,
    filteredRows: displayRows,
    fetchStatus,
    fetchError,
    reload,
    retry: () => void reload(),
    query,
    setQuery,
    debouncedQuery,
    resultFilter,
    setResultFilter,
    actionFilter,
    setActionFilter,
    severityFilter,
    setSeverityFilter,
    dateRange,
    setDateRange,
    liveStream,
    setLiveStream,
    autoScroll,
    setAutoScroll,
    highlightedIds,
    criticalFlashIds,
    exportFilteredCsv,
    pollStreamOnce: pollStream,
    filterCriteria,
    isEmptyFiltered,
    isEmptyCatalog: fetchStatus === "ready" && catalog.length === 0,
    burstTicker,
    correlation,
    incidentIds,
    investigationQueue,
    analystTrail,
    refreshAnalystTrail,
    blockIpForLog,
    markAsIncident,
    addToInvestigation,
  };
}
