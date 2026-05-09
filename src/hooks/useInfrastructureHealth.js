import { useMemo } from "react";

const METRIC_PROFILES = [
  { tag: "SECURE-LINK", pattern: "stable", source: "AES-GCM stream" },
  { tag: "API-GW", pattern: "latency", source: "gateway p95" },
  { tag: "SESSION", pattern: "confidence", source: "zero-trust broker" },
  { tag: "DEVICE", pattern: "adaptive", source: "FTTH posture sync" },
  { tag: "RELAY-SYNCED", pattern: "sync", source: "cloud relay mesh" },
];

function sparkline(seed, pattern) {
  return Array.from({ length: 14 }, (_, i) => {
    const base = pattern === "stable" ? 78 : pattern === "latency" ? 58 : pattern === "confidence" ? 74 : 62;
    const wave = pattern === "stable"
      ? Math.sin((seed + i) * 0.25) * 4
      : pattern === "latency"
        ? Math.sin((seed + i) * 0.74) * 15 + Math.cos((seed + i) * 0.31) * 5
        : pattern === "confidence"
          ? Math.sin((seed + i) * 0.38) * 7
          : pattern === "sync"
            ? Math.sin((seed + i) * 0.68) * 12
            : Math.sin((seed + i) * 0.52) * 10 + (i % 7 === 0 ? 8 : 0);
    return Math.max(10, Math.min(95, Math.round(base + wave)));
  });
}

export function useInfrastructureHealth(baselineMetrics, events) {
  return useMemo(() => {
    const latest = events?.[0];
    const pressure = latest?.severity === "critical" ? -5 : latest?.severity === "high" ? -3 : 1;
    return (baselineMetrics || []).map((metric, idx) => {
      const profile = METRIC_PROFILES[idx % METRIC_PROFILES.length];
      const value = Math.max(35, Math.min(100, Number(metric.value || 0) + pressure - (idx % 2)));
      const delta = pressure - (idx % 2);
      const phase = (events?.length ?? 0) + idx;
      return {
        ...metric,
        profileTag: profile.tag,
        telemetrySource: profile.source,
        importance: idx === 0 ? "primary" : idx === 1 ? "latency-sensitive" : "assurance",
        value,
        trend: delta >= 0 ? "up" : "down",
        delta,
        latencyMs: 10 + idx * 4 + Math.max(0, (100 - value) / 7) + (profile.pattern === "latency" ? phase % 3 : 0),
        syncState: value >= 86 ? "synced" : value >= 72 ? "monitoring" : "degraded",
        throughput: Math.round((latest?.metadata?.encryptionThroughput ?? 180) * (0.64 + idx * 0.065)),
        updatedAt: new Date().toISOString(),
        series: sparkline(idx + value + phase, profile.pattern),
      };
    });
  }, [baselineMetrics, events]);
}

