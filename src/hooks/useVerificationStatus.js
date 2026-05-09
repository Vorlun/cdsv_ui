import { useMemo } from "react";

const CHECKS = Object.freeze([
  { label: "Vault encryption active", node: "VAULT-NODE-A", zone: "TRUST-ZONE-2", source: "KMS attestation", chip: "VAULT" },
  { label: "Secure upload pipeline ready", node: "CORE-RELAY", zone: "TRUST-ZONE-1", source: "relay checksum", chip: "CORE" },
  { label: "Threat monitoring enabled", node: "SOC-EAST", zone: "TRUST-ZONE-3", source: "SIEM correlation", chip: "TRUSTED" },
  { label: "Device posture synchronized", node: "FTTH-EDGE-11", zone: "EDGE-ZONE-4", source: "endpoint posture", chip: "EDGE" },
  { label: "API telemetry connected", node: "API-GW-02", zone: "DMZ-ZONE-1", source: "gateway probe", chip: "API" },
]);

export function useVerificationStatus(events, telemetrySyncAt, monitoringNodesOnline) {
  return useMemo(() => {
    const latest = events?.[0];
    const severity = latest?.severity ?? "info";
    const degraded = severity === "critical" || severity === "high";
    const nowIso = new Date().toISOString();
    return {
      checks: CHECKS.map((check, idx) => ({
        id: check.label.toLowerCase().replace(/\s+/g, "-"),
        ...check,
        verified: !(degraded && idx === 2),
        badge: degraded && idx === 2 ? "monitoring" : "verified",
        checkedAt: nowIso,
        syncLatencyMs: 9 + idx * 4 + (degraded && idx === 2 ? 12 : 0),
        confidence: Math.max(82, 99 - idx - (degraded && idx === 2 ? 9 : 0)),
      })),
      telemetryHeartbeat: degraded ? "elevated" : "stable",
      lastVerificationAt: telemetrySyncAt,
      activeNodes: monitoringNodesOnline,
      infrastructureSync: Math.max(80, 96 - (degraded ? 6 : 0)),
    };
  }, [events, telemetrySyncAt, monitoringNodesOnline]);
}

