import { useCallback, useEffect, useMemo, useState } from "react";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { sanitizePlainText } from "@/utils/sanitize";

function validateLogSearchQuery(raw) {
  return sanitizePlainText(String(raw ?? ""), 200);
}

/**
 * Audit matrix backed by GET /logs + SOC stream parity updates.
 */
export function useLogs(options = {}) {
  const streamIntervalMs = options.streamIntervalMs ?? 5500;

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState({ key: "time", direction: "desc" });
  const pageSize = options.pageSize ?? 4;

  const debouncedQuery = useDebouncedValue(validateLogSearchQuery(query), 260);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const bundle = await socApi.logs();
      setRows(Array.isArray(bundle.items) ? bundle.items.map((r) => ({ ...r })) : []);
      setStatus("ready");
    } catch (err) {
      setRows([]);
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
      setRows(pulse.logs.map((r) => ({ ...r })));
    }, streamIntervalMs);
    return off;
  }, [status, streamIntervalMs]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => {
      const dir = sortBy.direction === "asc" ? 1 : -1;
      const av = a[sortBy.key] ?? "";
      const bv = b[sortBy.key] ?? "";
      return String(av).localeCompare(String(bv)) * dir;
    });
    return sorted.filter((item) => {
      const haystack =
        `${item.user} ${item.email} ${item.ip} ${item.action} ${item.result} ${item.location ?? ""} ${item.device ?? ""} ${item.severity ?? ""}`.toLowerCase();
      const matchQuery = !q || haystack.includes(q);
      const matchStatus =
        statusFilter === "all"
          ? true
          : String(item.result).toLowerCase() === statusFilter.toLowerCase();
      return matchQuery && matchStatus;
    });
  }, [rows, debouncedQuery, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const pagedLogs = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  const setQueryAndResetPage = useCallback((value) => {
    setPage(1);
    setQuery(validateLogSearchQuery(value));
  }, []);

  const setStatusAndResetPage = useCallback((value) => {
    setPage(1);
    setStatusFilter(value);
  }, []);

  const toggleSort = useCallback((key) => {
    setSortBy((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const retry = useCallback(() => void reload(), [reload]);

  return {
    status,
    error,
    rows,
    filtered,
    pagedLogs,
    pageCount,
    page: pageSafe,
    setPage,
    pageSize,
    query,
    setQuery,
    debouncedQuery,
    statusFilter,
    setStatusFilter,
    setQueryAndResetPage,
    setStatusAndResetPage,
    sortBy,
    toggleSort,
    reload,
    retry,
    isEmpty: status === "ready" && filtered.length === 0,
  };
}
