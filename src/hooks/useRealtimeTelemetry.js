import { useMemo } from "react";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { useTelemetryBuffer } from "@/hooks/useTelemetryBuffer";
import { useRealtimeChart } from "@/hooks/useRealtimeChart";

export function useRealtimeTelemetry() {
  const { events, latest, stats } = useTelemetrySocket(120);
  const bufferedEvents = useTelemetryBuffer(events, 90);
  const chartStream = useRealtimeChart({
    length: 64,
    fps: 20,
    events: bufferedEvents,
  });

  const semanticMetrics = useMemo(() => {
    const total = Math.max(1, events.length);
    const secureEvents = events.filter((e) => ["low", "info"].includes(String(e.severity ?? "").toLowerCase())).length;
    const suspicious = events.filter((e) => ["medium", "high", "critical"].includes(String(e.severity ?? "").toLowerCase())).length;
    const uploadTelemetry = events.filter((e) => String(e.type ?? "").includes("upload")).length;
    const apiGatewayLoad = events.filter((e) => String(e.source ?? "").toLowerCase().includes("gateway") || String(e.type ?? "").includes("gateway")).length;
    const encryptionWorkload = events.filter((e) => String(e.type ?? "").includes("encryption") || String(e.source ?? "").toLowerCase().includes("vault")).length;
    const latestMeta = events[0]?.metadata && typeof events[0].metadata === "object" ? events[0].metadata : {};
    const activeSecureChannels = Math.max(12, Math.min(48, 18 + secureEvents + Math.round(total * 0.4)));
    const packetIntegrityScore = Math.max(91, Math.min(99.9, Number(latestMeta.packetIntegrityScore ?? 98.6) - suspicious * 0.08));
    const encryptedTrafficRate = Math.max(88, Math.min(99.8, Number(latestMeta.encryptedTrafficRate ?? 96.8) + encryptionWorkload * 0.15 - suspicious * 0.2));
    const anomalyConfidence = Math.max(2, Math.min(88, Number(latestMeta.anomalyConfidence ?? suspicious * 7 + (stats.critical * 12))));
    return {
      uploadTelemetry,
      apiGatewayLoad,
      encryptionWorkload,
      suspiciousActivity: suspicious,
      verifiedSecureEvents: secureEvents,
      isolatedAnomalies: events.filter((e) => String(e.type ?? "").includes("isolated")).length,
      authenticatedSessions: activeSecureChannels,
      activeSecureChannels,
      packetIntegrityScore: packetIntegrityScore.toFixed(1),
      encryptedTrafficRate: encryptedTrafficRate.toFixed(1),
      secureApiThroughput: Math.max(220, Math.round(Number(latestMeta.secureApiThroughput ?? 420) + apiGatewayLoad * 9)),
      edgeLatencyMs: Math.max(8, Math.min(42, Math.round(Number(latestMeta.edgeLatencyMs ?? 18) + suspicious * 0.7))),
      cloudRelayHealth: Math.max(90, Math.min(100, Math.round(Number(latestMeta.cloudRelayHealth ?? 98) - suspicious * 0.35))),
      trafficInspectionRate: Math.max(84, Math.min(100, Math.round(Number(latestMeta.trafficInspectionRate ?? 94) + total * 0.08))),
      anomalyConfidence,
    };
  }, [events, stats.critical]);

  return { events, latest, stats, bufferedEvents, chartStream, semanticMetrics };
}

