function cloneGovernance(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Telecom-style governance snapshot (serialized for export / SSE fan-out). */
export const SECURITY_GOVERNANCE_DEFAULTS = Object.freeze({
  schemaVersion: 1,
  generatedAtLabel: "",
  security: Object.freeze({
    threatSensitivity: 76,
    autoBlockSuspiciousIp: true,
    force2fa: true,
    sessionTimeoutMinutes: 30,
    passwordPolicy: "Strict",
    requireEncryption: true,
    trustedDevicesOnly: false,
  }),
  notifications: Object.freeze({
    emailAlerts: true,
    pushAlerts: true,
    weeklySummary: false,
    criticalOnly: false,
    simulateSlack: true,
    simulateTelegram: false,
    minimumDispatchSeverity: "Medium",
  }),
  integrations: Object.freeze({
    webhookThreatPathEnabled: true,
    slackChannelSim: "soc-ingest-bridge",
    telegramTopicSim: "carrier_soc_feed",
    lastOutboundWebhookReceipt: "",
  }),
  rbacMatrix: Object.freeze({
    viewThreats: Object.freeze({ Admin: true, Analyst: true, Viewer: true }),
    blockIp: Object.freeze({ Admin: true, Analyst: false, Viewer: false }),
    manageUsers: Object.freeze({ Admin: true, Analyst: false, Viewer: false }),
    exportLogs: Object.freeze({ Admin: true, Analyst: true, Viewer: false }),
  }),
});

/** @param {Partial<typeof SECURITY_GOVERNANCE_DEFAULTS>} patch */
export function mergeGovernance(base, patch) {
  const next = cloneGovernance(base);
  if (patch.schemaVersion != null) next.schemaVersion = patch.schemaVersion;
  if (patch.security) next.security = { ...next.security, ...patch.security };
  if (patch.notifications) next.notifications = { ...next.notifications, ...patch.notifications };
  if (patch.integrations) next.integrations = { ...next.integrations, ...patch.integrations };
  if (patch.rbacMatrix) {
    next.rbacMatrix = { ...next.rbacMatrix };
    for (const [k, row] of Object.entries(patch.rbacMatrix)) {
      next.rbacMatrix[k] = { ...next.rbacMatrix[k], ...row };
    }
  }
  return next;
}

