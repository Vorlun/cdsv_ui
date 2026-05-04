/** @typedef {"Critical"|"High"|"Medium"|"Low"|string} AlertSeverity */

/**
 * Ordinal comparison for SOC dispatch policy.
 * @param {AlertSeverity} sev
 */
export function govSeverityOrdinal(sev) {
  const s = String(sev ?? "");
  if (s === "Critical") return 4;
  if (s === "High") return 3;
  if (s === "Medium") return 2;
  if (s === "Low") return 1;
  return 2;
}

/**
 * Whether integration / notification envelopes should mirror this alert row.
 */
export function shouldEmitGovernanceNotification(governanceNotifications, alert) {
  const n = governanceNotifications ?? {};
  if (!alert?.severity) return false;
  if (n.criticalOnly && alert.severity !== "Critical") return false;
  const min = govSeverityOrdinal(n.minimumDispatchSeverity ?? "Medium");
  if (govSeverityOrdinal(alert.severity) < min) return false;
  return Boolean(n.simulateSlack || n.simulateTelegram || n.emailAlerts || n.pushAlerts);
}

/**
 * @param {object} integrations
 */
export function buildSimulatedOutboundMessages(integrations, governanceNotifications, alert, reason = "stream_spawn") {
  const lines = [];
  const corr = sanitizeId(alert?.id ?? "unknown");
  const msg = sanitizeId(alert?.message ?? "").slice(0, 380);
  if (integrations?.webhookThreatPathEnabled !== false && governanceNotifications?.emailAlerts !== false) {
    lines.push({
      channel: "webhook",
      text: sanitizeId(`POST /webhook/threat · corr=${corr} · sev=${alert.severity} · ${reason} · ${msg}`),
    });
  }
  if (governanceNotifications?.simulateSlack) {
    lines.push({
      channel: "slack",
      text: sanitizeId(`[#${integrations?.slackChannelSim ?? "soc"}] ${alert.severity}: ${msg}`),
    });
  }
  if (governanceNotifications?.simulateTelegram) {
    lines.push({
      channel: "telegram",
      text: sanitizeId(`[topic:${integrations?.telegramTopicSim ?? "soc"}] ${alert.severity} · ${msg}`),
    });
  }
  if (governanceNotifications?.pushAlerts) {
    lines.push({
      channel: "push",
      text: sanitizeId(`${alert.severity} · mobile bridge · ${corr}`),
    });
  }
  return lines;
}

function sanitizeId(s) {
  return String(s ?? "").replace(/[<>'"]+/g, "").slice(0, 420);
}
