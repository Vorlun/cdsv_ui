import { useMemo } from "react";

export function useRealtimeMetrics(baselineMetrics, events) {
  return useMemo(() => {
    const event = events[0];
    const impact = event?.severity === "critical" ? -4 : event?.severity === "high" ? -2 : 1;
    return (baselineMetrics || []).map((metric, idx) => ({
      ...metric,
      value: Math.max(35, Math.min(100, metric.value + impact - idx % 2)),
      checkedAt: new Date().toISOString(),
      status: metric.value >= 85 ? "verified" : metric.value >= 70 ? "monitoring" : "degraded",
    }));
  }, [baselineMetrics, events]);
}

