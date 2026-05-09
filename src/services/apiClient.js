import { apiBlobRequest, apiRequest } from "@/services/api/apiRequest";
import { connectTelemetrySocket } from "@/services/websocket/telemetrySocket";

export async function apiClient(method, path, options = {}) {
  return apiRequest(path, {
    method,
    body: options.body,
    signal: options.signal,
  });
}

export function subscribeSocStream(_handler) {
  const socket = connectTelemetrySocket();
  const handler = (payload) => _handler?.(payload);
  socket.on("telemetry:event", handler);
  return () => socket.off("telemetry:event", handler);
}

export const socApi = {
  governanceSettings: () => apiClient("GET", "/governance/settings"),
  governanceAudit: () => apiClient("GET", "/governance/audit"),
  governanceOutbox: () => apiClient("GET", "/governance/outbox"),
  governanceExport: () => apiClient("GET", "/governance/export"),
  governanceSave: (body) => apiClient("POST", "/governance/settings", { body }),
  governanceImport: (body) => apiClient("POST", "/governance/import", { body }),
  webhookThreatIngest: (body) => apiClient("POST", "/webhook/threat", { body }),
  uploadSecurityFeed: () => apiClient("GET", "/uploads/security"),
  uploadSecuritySimulate: (body) => apiClient("POST", "/uploads/security/simulate", { body }),
  uploadSecurityAction: (body) => apiClient("POST", "/uploads/security/action", { body }),
  dashboardStats: () => apiClient("GET", "/dashboard/overview"),
  securityOverview: () => apiClient("GET", "/security/overview"),
  securityAuthMetrics: () => apiClient("GET", "/security/auth-metrics"),
  securityEncryption: () => apiClient("GET", "/security/encryption"),
  securityControls: () => apiClient("GET", "/security/controls"),
  securityEvents: (limit) =>
    apiClient(
      "GET",
      `/security/events${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ""}`,
    ),
  securityControlDetail: (id) => apiClient("GET", `/security/control/${encodeURIComponent(id)}`),
  securityControlRefresh: (id) =>
    apiClient("POST", `/security/control/${encodeURIComponent(id)}/refresh`),
  adminStats: () => apiClient("GET", "/admin/stats"),
  adminDashboardOverview: () => apiClient("GET", "/admin/dashboard/overview"),
  adminFiles: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return apiClient("GET", `/admin/files${qs ? `?${qs}` : ""}`);
  },
  /** Admin forensic catalogue — DB-backed, same filters as `admin/files` (canonical SOC path). */
  uploadsCatalog: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return apiClient("GET", `/uploads${qs ? `?${qs}` : ""}`);
  },
  uploadForensicDetail: (id) => apiClient("GET", `/uploads/${encodeURIComponent(id)}`),
  uploadTimeline: (id) => apiClient("GET", `/uploads/${encodeURIComponent(id)}/timeline`),
  uploadAnalysis: (id) => apiClient("GET", `/uploads/${encodeURIComponent(id)}/analysis`),
  uploadExportReport: (id) => apiClient("GET", `/uploads/${encodeURIComponent(id)}/export`),
  uploadRescan: (id) => apiClient("POST", `/uploads/${encodeURIComponent(id)}/rescan`),
  uploadQuarantine: (id, body) =>
    apiClient("POST", `/uploads/${encodeURIComponent(id)}/quarantine`, { body }),
  uploadDelete: (id) => apiClient("DELETE", `/uploads/${encodeURIComponent(id)}`),
  uploadDownloadBlob: (id, opts = {}) =>
    apiBlobRequest(`/uploads/${encodeURIComponent(id)}/download`, opts),
  adminAnalytics: () => apiClient("GET", "/admin/analytics"),
  adminLogs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return apiClient("GET", `/admin/logs${qs ? `?${qs}` : ""}`);
  },
  adminHealth: () => apiClient("GET", "/admin/health"),
  logs: () => apiClient("GET", "/security/logs"),
  /** Admin SIEM corpus — merged Activity + Security + Telemetry + Upload + Threat + Audit + Integrity */
  siemLogsFeed: (params = {}) => {
    const sp = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== "")),
    ).toString();
    return apiClient("GET", `/logs/feed${sp ? `?${sp}` : ""}`);
  },
  logsOverview: () => apiClient("GET", "/logs/overview"),
  logsMetrics: () => apiClient("GET", "/logs/metrics"),
  logsDisposition: () => apiClient("GET", "/logs/disposition"),
  logsGeography: () => apiClient("GET", "/logs/geography"),
  logsBlockedSources: () => apiClient("GET", "/logs/blocked-sources"),
  logsRetention: () => apiClient("GET", "/logs/retention"),
  logsSearch: (params = {}) => {
    const sp = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== "")),
    ).toString();
    return apiClient("GET", `/logs/search${sp ? `?${sp}` : ""}`);
  },
  logsEventDetail: (id) => apiClient("GET", `/logs/event/${encodeURIComponent(id)}`),
  logsExport: (body) => apiClient("POST", "/logs/export", { body }),
  logsReplay: (body) => apiClient("POST", "/logs/replay", { body }),
  auditLogsStream: (since) =>
    apiClient(
      "GET",
      `/logs/stream${since ? `?since=${encodeURIComponent(String(since))}` : ""}`,
    ),
  auditLogsFilter: (criteria) => apiClient("POST", "/logs/filter", { body: { criteria } }),
  analystActions: () => apiClient("GET", "/logs/analyst-actions"),
  logAnalystAction: (body) => apiClient("POST", "/logs/action", { body }),
  threats: () => apiClient("GET", "/threats"),
  soarSnapshot: () => apiClient("GET", "/soar/snapshot"),
  soarIncidents: () => apiClient("GET", "/soar/incidents"),
  soarFeed: () => apiClient("GET", "/soar/feed"),
  soarCampaigns: () => apiClient("GET", "/soar/campaigns"),
  soarTimeline: () => apiClient("GET", "/soar/timeline"),
  soarGeography: () => apiClient("GET", "/soar/geography"),
  soarPlaybooks: () => apiClient("GET", "/soar/playbooks"),
  soarMetrics: () => apiClient("GET", "/soar/metrics"),
  soarAction: (body) => apiClient("POST", "/soar/action", { body }),
  aiOverview: () => apiClient("GET", "/ai/overview"),
  aiModels: () => apiClient("GET", "/ai/models"),
  aiModelDetail: (id) => apiClient("GET", `/ai/models/${encodeURIComponent(id)}`),
  aiDetections: (limit) =>
    apiClient("GET", `/ai/detections${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ""}`),
  aiActivity: () => apiClient("GET", "/ai/activity"),
  aiClassification: () => apiClient("GET", "/ai/classification"),
  aiPerformance: () => apiClient("GET", "/ai/performance"),
  aiFeed: (limit) =>
    apiClient("GET", `/ai/feed${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ""}`),
  aiModelRetrain: (id, body = {}) =>
    apiClient("POST", `/ai/models/${encodeURIComponent(id)}/retrain`, { body }),
  aiModelRestart: (id, body = {}) =>
    apiClient("POST", `/ai/models/${encodeURIComponent(id)}/restart`, { body }),
  aiModelRollback: (id, body = {}) =>
    apiClient("POST", `/ai/models/${encodeURIComponent(id)}/rollback`, { body }),
  analyticsOverview: () => apiClient("GET", "/analytics/overview"),
  analyticsUsers: (limit) =>
    apiClient("GET", `/analytics/users${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ""}`),
  analyticsUser: (id) => apiClient("GET", `/analytics/user/${encodeURIComponent(id)}`),
  analyticsThreats: () => apiClient("GET", "/analytics/threats"),
  analyticsUploads: () => apiClient("GET", "/analytics/uploads"),
  analyticsSystem: () => apiClient("GET", "/analytics/system"),
  analyticsTelemetry: () => apiClient("GET", "/analytics/telemetry"),
  analyticsAi: () => apiClient("GET", "/analytics/ai"),
  analyticsFeed: (limit) =>
    apiClient("GET", `/analytics/feed${limit != null ? `?limit=${encodeURIComponent(String(limit))}` : ""}`),
  analyticsTrends: () => apiClient("GET", "/analytics/trends"),
  analyticsRegistrationAuth: () => apiClient("GET", "/analytics/registration-auth"),
  analyticsSecuritySeries: () => apiClient("GET", "/analytics/security-series"),
  analyticsFileTypes: () => apiClient("GET", "/analytics/file-types"),
  usersList: (params = {}) => {
    const sp = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      )
    );
    const qs = sp.toString();
    return apiClient("GET", `/users${qs ? `?${qs}` : ""}`);
  },
  userProfile: (id) => apiClient("GET", `/users/${encodeURIComponent(id)}`),
  userActivity: (id) => apiClient("GET", `/users/${encodeURIComponent(id)}/activity`),
  userFiles: (id) => apiClient("GET", `/users/${encodeURIComponent(id)}/files`),
  usersDirectorySignals: () => apiClient("GET", `/users/signals/directory`),
  createUser: (body) => apiClient("POST", "/users", { body }),
  updateUser: (id, body) => apiClient("PATCH", `/users/${encodeURIComponent(id)}`, { body }),
  resetUserPassword: (id, body) =>
    apiClient("POST", `/users/${encodeURIComponent(id)}/reset-password`, { body }),
  revokeUserSessions: (id) => apiClient("POST", `/users/${encodeURIComponent(id)}/revoke-sessions`),
  deleteUser: (id) =>
    apiClient("DELETE", `/users/${encodeURIComponent(id)}`),
  blockIp: (body) =>
    apiClient("POST", "/security/block-ip", {
      body: typeof body === "string" ? { ip: body } : body,
    }),
  revokeSession: (principal) =>
    apiClient("POST", "/sessions/revoke", { body: { principal } }),
  startScan: () => apiClient("POST", "/security/scan"),
  exportLogsAck: (body) => apiClient("POST", "/exports/logs", { body }),
};
