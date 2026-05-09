import { useMemo } from "react";

const TELECOM_LABELS = {
  integrity: "Packet integrity confidence",
  scan: "Traffic inspection success",
  assets: "Protected telecom assets",
  sessions: "Authenticated relay sessions",
  anomaly: "Edge anomaly indicators",
};

export function useSecurityAnalytics(analytics, events) {
  return useMemo(() => {
    const latest = events[0];
    return (analytics || []).map((item) => {
      const base = Number.parseInt(String(item.value).replace(/[^\d]/g, ""), 10) || 0;
      const bump = latest?.severity === "critical" ? -2 : latest?.severity === "high" ? -1 : 1;
      const nextValue = item.value.includes("%")
        ? `${Math.max(0, Math.min(100, base + bump))}%`
        : String(Math.max(0, base + bump));
      return {
        ...item,
        label: TELECOM_LABELS[item.key] ?? item.label,
        value: nextValue,
        delta: bump,
        live: true,
      };
    });
  }, [analytics, events]);
}

