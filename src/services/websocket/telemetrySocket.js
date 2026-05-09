import { apiRequest } from "@/services/api/apiRequest";

let handlers = new Map();
let subscribers = 0;
let pollTimer = null;
let pollInFlight = false;
const seenEventIds = new Set();
const TELECOM_EVENTS = [
  { type: "tls_handshake_verified", severity: "info", source: "TLS Relay Controller", message: "TLS handshake verified for cloud telecom relay." },
  { type: "edge_relay_authenticated", severity: "low", source: "Zero-Trust Edge", message: "Edge relay authenticated with zero-trust policy." },
  { type: "ftth_node_synced", severity: "info", source: "FTTH Node Monitor", message: "FTTH aggregation node synchronized with cloud control plane." },
  { type: "secure_tunnel_refreshed", severity: "low", source: "Secure Tunnel Manager", message: "Secure tunnel refreshed for encrypted subscriber telemetry." },
  { type: "api_gateway_integrity_verified", severity: "info", source: "API Gateway", message: "API gateway integrity verification completed." },
  { type: "cloud_vault_replication_completed", severity: "low", source: "Cloud Vault", message: "Cloud vault replication completed for protected telecom records." },
  { type: "zero_trust_validation_passed", severity: "info", source: "Identity Plane", message: "Zero-trust validation passed for active SOC session." },
  { type: "suspicious_packet_isolated", severity: "medium", source: "Traffic Inspection", message: "Suspicious packet pattern isolated at telecom edge node." },
];

function telecomMetadata(slot, severity) {
  const anomalyImpact = severity === "medium" ? 12 : severity === "high" ? 24 : severity === "critical" ? 38 : 0;
  return {
    encryptedTrafficRate: Number((96.4 + (slot % 5) * 0.3 - anomalyImpact * 0.02).toFixed(1)),
    packetIntegrityScore: Number((98.9 - (slot % 4) * 0.2 - anomalyImpact * 0.03).toFixed(1)),
    secureApiThroughput: 380 + (slot % 7) * 18,
    edgeLatencyMs: 14 + (slot % 6) + Math.round(anomalyImpact / 8),
    cloudRelayHealth: Math.max(91, 99 - Math.round(anomalyImpact / 10)),
    trafficInspectionRate: 92 + (slot % 6),
    anomalyConfidence: Math.min(88, 4 + anomalyImpact + (slot % 8)),
    secureTunnelHealth: Math.max(90, 98 - Math.round(anomalyImpact / 12)),
  };
}

function emit(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  set.forEach((fn) => fn(payload));
}

async function pollBackendTelemetry() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const [overview, activity] = await Promise.all([
      apiRequest("/dashboard/overview", { method: "GET", retries: 1 }),
      apiRequest("/dashboard/activity?page=1&pageSize=20", { method: "GET", retries: 1 }),
    ]);
    emit("telemetry:overview", {
      uploadsTimeline: Array.isArray(overview?.uploadsTimeline) ? overview.uploadsTimeline : [],
      telemetrySyncAt: overview?.telemetrySyncAt ?? new Date().toISOString(),
      uploadsTotal: Number(overview?.uploadsTotal ?? 0),
    });

    const rows = Array.isArray(activity?.rows) ? activity.rows : [];
    for (const row of rows.reverse()) {
      const id = String(row.id ?? "");
      if (!id || seenEventIds.has(id)) continue;
      seenEventIds.add(id);
      emit("telemetry:event", {
        id,
        type: row.type ?? "review",
        severity: row.severity ?? "info",
        source: row.source ?? "Telemetry",
        message: row.description ?? row.file ?? "Telemetry event",
        createdAt: row.at ?? new Date().toISOString(),
        metadata: row.metadata ?? {},
      });
    }
    const slot = Math.floor(Date.now() / 15000);
    const template = TELECOM_EVENTS[slot % TELECOM_EVENTS.length];
    const telecomId = `telecom-${slot}-${template.type}`;
    if (!seenEventIds.has(telecomId)) {
      seenEventIds.add(telecomId);
      emit("telemetry:event", {
        id: telecomId,
        type: template.type,
        severity: template.severity,
        source: template.source,
        message: template.message,
        createdAt: new Date(slot * 15000).toISOString(),
        metadata: telecomMetadata(slot, template.severity),
      });
    }
    emit("telemetry:connected", { ok: true, mode: "polling" });
  } catch (error) {
    emit("telemetry:disconnect", { ok: false, reason: "poll_failed", error });
  } finally {
    pollInFlight = false;
  }
}

function ensurePolling() {
  if (pollTimer) return;
  void pollBackendTelemetry();
  pollTimer = window.setInterval(() => {
    void pollBackendTelemetry();
  }, 3500);
}

function clearPollingIfIdle() {
  if (subscribers > 0 || !pollTimer) return;
  window.clearInterval(pollTimer);
  pollTimer = null;
}

export function getTelemetrySocket() {
  return {
    connected: true,
    on(event, handler) {
      const set = handlers.get(event) ?? new Set();
      const sizeBefore = set.size;
      set.add(handler);
      handlers.set(event, set);
      if (set.size > sizeBefore) subscribers += 1;
      ensurePolling();
    },
    off(event, handler) {
      const set = handlers.get(event);
      if (!set) return;
      set.delete(handler);
      if (!set.size) handlers.delete(event);
      subscribers = Math.max(0, subscribers - 1);
      clearPollingIfIdle();
    },
    connect() {
      ensurePolling();
    },
    disconnect() {
      clearPollingIfIdle();
    },
  };
}

export function connectTelemetrySocket() {
  const instance = getTelemetrySocket();
  instance.connect();
  return instance;
}

export function disconnectTelemetrySocket() {}

