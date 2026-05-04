import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ShieldAlert, UploadCloud, UserX, Users } from "lucide-react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

const ICON_MAP = {
  users: Users,
  upload: UploadCloud,
  "user-x": UserX,
  ban: Ban,
  "shield-alert": ShieldAlert,
};

/**
 * Operator dashboard KPI + telemetry shell (consumes GET /dashboard/stats).
 */
export function useDashboard(options = {}) {
  const streamIntervalMs = options.streamIntervalMs ?? 5500;
  const actorPrincipal = options.actorPrincipal ?? "operator@test.com";
  const socRole = options.socRole ?? "";
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [chartRange, setChartRange] = useState("daily");
  const [blockedIps, setBlockedIps] = useState([]);
  const [activeSessionsLive, setActiveSessionsLive] = useState(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const next = await socApi.dashboardStats();
      setSnapshot(next);
      setBlockedIps(Array.isArray(next.blockedIps) ? [...next.blockedIps] : []);
      setActiveSessionsLive(typeof next.activeSessions === "number" ? next.activeSessions : null);
      setStatus("ready");
    } catch (err) {
      const normalized = normalizeSocError(err);
      setError(normalized.message);
      setSnapshot(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    const off = subscribeSocStream((pulse) => {
      setActiveSessionsLive(pulse.activeSessions);
      setBlockedIps([...pulse.blockedIps]);
    }, streamIntervalMs);
    return off;
  }, [status, streamIntervalMs]);

  const chartData = useMemo(() => {
    if (!snapshot?.chartRanges) return null;
    return snapshot.chartRanges[chartRange] ?? null;
  }, [snapshot, chartRange]);

  const decorateMetricCards = useCallback(
    (dynamic) => {
      if (!snapshot) return [];
      return snapshot.metricDefinitions.map((definition) => {
        const Icon = ICON_MAP[definition.iconKey] ?? Users;
        const iconColor = definition.iconColor ?? "text-[#93C5FD]";
        let value = definition.value;
        if (definition.dynamicSource === "blockedIpsLength") value = dynamic.blockedCount;
        else if (definition.dynamicSource === "openThreatCount") value = dynamic.openThreatCount;
        return { ...definition, value, icon: Icon, iconColor };
      });
    },
    [snapshot],
  );

  const blockSinkholeIpv4 = useCallback(async (ip) => {
    try {
      const res = await socApi.blockIp({ ip, actor: actorPrincipal, socRole });
      const list = Array.isArray(res.blockedIps) ? res.blockedIps : [];
      setBlockedIps(list);
      return { ok: true, blockedIps: list };
    } catch (err) {
      const normalized = normalizeSocError(err);
      return { ok: false, message: normalized.message };
    }
  }, [actorPrincipal, socRole]);

  const activeSessions =
    typeof activeSessionsLive === "number" ? activeSessionsLive : (snapshot?.activeSessions ?? 0);

  const retry = useCallback(() => void reload(), [reload]);

  return {
    snapshot,
    status,
    error,
    reload,
    retry,
    chartRange,
    setChartRange,
    chartData,
    decorateMetricCards,
    blockedIps,
    blockSinkholeIpv4,
    activeSessions,
    isStreaming: status === "ready",
  };
}
