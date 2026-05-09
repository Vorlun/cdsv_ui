import { useMemo } from "react";

const CLASSIFICATIONS = [
  { role: "critical infrastructure", tag: "CORE-RELAY", channel: "secure control plane" },
  { role: "relay service", tag: "EDGE-04", channel: "encrypted subscriber relay" },
  { role: "monitoring service", tag: "SOC-EAST", channel: "telemetry inspection bus" },
  { role: "security validation", tag: "VAULT-NODE-A", channel: "integrity and archive service" },
  { role: "access protection", tag: "FTTH-11", channel: "cloud-edge gateway" },
];

function withTelemetry(node, idx, events) {
  const latest = events[idx % Math.max(1, events.length)];
  const severity = String(latest?.severity ?? "info").toLowerCase();
  const severityImpact = severity === "critical" ? 4 : severity === "high" ? 3 : severity === "medium" ? 1 : 0;
  const loadBase = Number(latest?.metadata?.apiGatewayLoad ?? latest?.metadata?.secureApiThroughput ?? 46 + idx * 7);
  const phase = (events.length + idx * 3) % 11;
  const classification = CLASSIFICATIONS[idx % CLASSIFICATIONS.length];
  const uptime = Math.max(92, 99 - severityImpact - (phase % 3));
  const latency = Math.max(8, Math.round((latest?.metadata?.edgeLatencyMs ?? (latest?.metadata?.packetRate ?? 320) / 24) + idx * 2 + severityImpact));
  const throughput = Math.round(Number(latest?.metadata?.encryptionThroughput ?? latest?.metadata?.secureApiThroughput ?? 180) * (0.72 + idx * 0.045));
  const anomalyConfidence = Math.max(2, Math.min(88, Number(latest?.metadata?.anomalyConfidence ?? severityImpact * 12 + phase)));
  return {
    ...node,
    classification: classification.role,
    nodeTag: classification.tag,
    channel: classification.channel,
    uptime,
    latency,
    requestLoad: Math.min(100, Math.round(loadBase)),
    throughput,
    syncHealth: Math.max(82, 99 - idx * 2 - severityImpact),
    packetInspection: Math.max(88, Math.min(99, 97 - severityImpact - (idx % 2))),
    secureTunnelStatus: severityImpact >= 3 ? "watch" : "synced",
    relayHeartbeat: Math.max(94, 99 - severityImpact - (phase % 2)),
    anomalyConfidence,
  };
}

export function useNodeHealth(nodes, events) {
  return useMemo(() => {
    if (!Array.isArray(nodes)) return [];
    return nodes.map((node, idx) => withTelemetry(node, idx, events || []));
  }, [nodes, events]);
}

