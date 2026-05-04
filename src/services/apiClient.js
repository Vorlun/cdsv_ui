/**
 * Production-style SOC API simulation (telecom OSS/BSS northbound abstraction).
 * Endpoints: /dashboard/stats, /logs, /logs/stream, /logs/filter, /logs/action,
 * /logs/analyst-actions, /threats, /users + security actions.
 * Includes random latency + optional failure injection for resilience testing.
 */

import { env } from "@/config/env";
import { delay } from "@/utils/delay";
import { ApiError } from "@/services/api/apiError";
import { sanitizePlainText } from "@/utils/sanitize";
import { isProbablyIpv4 } from "@/utils/ipValidation";
import { patchLiveLogs, patchThreatAlerts, jitterSessions } from "@/services/data/dashboardTelemetry";
import { METRIC_DEFINITIONS } from "@/services/data/dashboardApi";
import {
  APP_ROLES,
  canAssignAppRole,
  canChangeTargetRole,
  callerRankFromAuthRole,
  countAdmins,
} from "@/utils/rolePolicy";
import { validatePasswordPolicy } from "@/utils/userFormValidation";
import { computeSecurityScore } from "@/utils/securityScore";
import { normalizeAuditLog } from "@/utils/auditLogSchema";
import { filterAuditLogs } from "@/utils/siemAuditFilters";
import {
  SOAR_LIFECYCLE,
  buildAttackMix,
  buildMapPoints,
  buildThreatTimeline,
  buildTopCountriesFromLogs,
  correlateIncidentsFromLogs,
  summarizeGlobalRisk,
} from "@/utils/soarIncidentEngine";
import { assertValidManualTransition } from "@/utils/soarStateMachine";
import {
  INGEST_PIPELINE_STEPS,
  buildProcessedIngestionJob,
  sanitizeUploadFileName,
} from "@/utils/secureUploadPipeline";
import { SECURITY_GOVERNANCE_DEFAULTS, mergeGovernance } from "@/services/data/securityGovernanceDefaults";
import { normalizeSocRole, socMay } from "@/utils/socPermissions";
import {
  buildSimulatedOutboundMessages,
  shouldEmitGovernanceNotification,
} from "@/services/data/governanceEngine";

const DEFAULT_FAILURE_RATE = Number(import.meta.env.VITE_SOC_API_FAILURE_RATE ?? 0.07);
const MIN_LATENCY_MS = Number(import.meta.env.VITE_SOC_API_MIN_LATENCY_MS ?? 120);
const MAX_LATENCY_MS = Number(import.meta.env.VITE_SOC_API_MAX_LATENCY_MS ?? 520);

const CHART_RANGES = Object.freeze({
  daily: {
    loginAttempts: [
      { time: "00:00", attempts: 120 },
      { time: "04:00", attempts: 92 },
      { time: "08:00", attempts: 230 },
      { time: "12:00", attempts: 310 },
      { time: "16:00", attempts: 268 },
      { time: "20:00", attempts: 190 },
    ],
    uploadsThreats: [
      { label: "Mon", uploads: 320, threats: 18 },
      { label: "Tue", uploads: 420, threats: 22 },
      { label: "Wed", uploads: 390, threats: 17 },
      { label: "Thu", uploads: 460, threats: 25 },
      { label: "Fri", uploads: 510, threats: 28 },
      { label: "Sat", uploads: 280, threats: 11 },
      { label: "Sun", uploads: 260, threats: 9 },
    ],
  },
  weekly: {
    loginAttempts: [
      { time: "W1", attempts: 1060 },
      { time: "W2", attempts: 1220 },
      { time: "W3", attempts: 1410 },
      { time: "W4", attempts: 1340 },
    ],
    uploadsThreats: [
      { label: "W1", uploads: 2020, threats: 96 },
      { label: "W2", uploads: 2290, threats: 121 },
      { label: "W3", uploads: 2410, threats: 107 },
      { label: "W4", uploads: 2540, threats: 119 },
    ],
  },
  monthly: {
    loginAttempts: [
      { time: "Jan", attempts: 4020 },
      { time: "Feb", attempts: 4210 },
      { time: "Mar", attempts: 4480 },
      { time: "Apr", attempts: 4630 },
      { time: "May", attempts: 4870 },
      { time: "Jun", attempts: 4790 },
    ],
    uploadsThreats: [
      { label: "Jan", uploads: 9200, threats: 380 },
      { label: "Feb", uploads: 9850, threats: 421 },
      { label: "Mar", uploads: 10120, threats: 405 },
      { label: "Apr", uploads: 10790, threats: 438 },
      { label: "May", uploads: 11040, threats: 462 },
      { label: "Jun", uploads: 10880, threats: 447 },
    ],
  },
});

const THREAT_DISTRIBUTION = Object.freeze([
  { name: "Malware Uploads", percent: 32, count: 128, color: "#EF4444" },
  { name: "Suspicious Logins", percent: 25, count: 97, color: "#F59E0B" },
  { name: "API Abuse Attempts", percent: 23, count: 89, color: "#3B82F6" },
  { name: "Blocked Requests", percent: 20, count: 76, color: "#10B981" },
]);

const INITIAL_THREATS = [
  { id: "A1", message: "Brute force attempt detected", severity: "Critical", ago: "1m ago", dismissed: false },
  { id: "A2", message: "Suspicious login from new country", severity: "High", ago: "4m ago", dismissed: false },
  { id: "A3", message: "Too many failed requests", severity: "Medium", ago: "9m ago", dismissed: false },
  { id: "A4", message: "Unauthorized API access blocked", severity: "High", ago: "12m ago", dismissed: false },
];

function buildInitialAuditCatalog() {
  const templates = [
    {
      user: "Admin Operator",
      email: "admin@test.com",
      ip: "10.1.1.20",
      location: "Berlin, DE",
      device: "MacBook Pro (MDM-managed)",
      action: "Login",
      result: "Success",
      risk: 21,
    },
    {
      user: "User Analyst",
      email: "user@test.com",
      ip: "10.1.1.34",
      location: "Tashkent, UZ",
      device: "iPhone 15",
      action: "Upload",
      result: "Success",
      risk: 36,
    },
    {
      user: "Unknown",
      email: "-",
      ip: "185.23.11.92",
      location: "Frankfurt, DE",
      device: "Firefox / Win10",
      action: "Login",
      result: "Blocked",
      risk: 88,
    },
    {
      user: "SOC Viewer",
      email: "soc.viewer@test.com",
      ip: "192.168.4.20",
      location: "Amsterdam, NL",
      device: "Windows 11 Desktop",
      action: "Export",
      result: "Success",
      risk: 29,
    },
    {
      user: "Unknown",
      email: "-",
      ip: "91.80.27.9",
      location: "Warsaw, PL",
      device: "curl/7.68",
      action: "API Probe",
      result: "Blocked",
      risk: 95,
    },
    {
      user: "User Analyst",
      email: "user@test.com",
      ip: "10.1.1.34",
      location: "Tashkent, UZ",
      device: "iPhone 15",
      action: "Delete",
      result: "Denied",
      risk: 62,
    },
    {
      user: "Cloud Reviewer",
      email: "reviewer@test.com",
      ip: "185.22.41.90",
      location: "New York, US",
      device: "Edge / Win11",
      action: "Export",
      result: "Failed",
      risk: 71,
    },
    {
      user: "Unknown",
      email: "-",
      ip: "185.90.77.112",
      location: "Singapore",
      device: "Chrome / Linux",
      action: "API Probe",
      result: "Blocked",
      risk: 97,
    },
  ];
  const now = Date.now();
  const rows = [];
  for (let i = 0; i < 52; i++) {
    const t = templates[i % templates.length];
    const skewH = (i * 41) % 96;
    const skewD = i % 18;
    const ts = new Date(now - skewH * 3600000 - skewD * 86400000).toISOString();
    rows.push(
      normalizeAuditLog({
        id: `L-${2000 + i}`,
        timestamp: ts,
        user: t.user,
        email: t.email,
        ip: t.ip,
        location: t.location,
        device: t.device,
        action: t.action,
        result: t.result,
        meta: {
          risk: Math.min(100, t.risk + (i % 9)),
          sessionId: `sess_${3200 + i}`,
        },
      }),
    );
  }
  return rows;
}

const USER_DIRECTORY = [
  {
    id: "usr-1",
    displayName: "Admin Operator",
    email: "admin@test.com",
    role: "admin",
    pop: "eu-west",
  },
  {
    id: "usr-2",
    displayName: "User Analyst",
    email: "user@test.com",
    role: "user",
    pop: "ap-south",
  },
  {
    id: "usr-3",
    displayName: "SOC Viewer",
    email: "soc.viewer@test.com",
    role: "analyst",
    pop: "eu-central",
  },
];

const SCAN_STAGES = [
  "Checking active sessions...",
  "Inspecting suspicious IP traffic...",
  "Verifying token abuse patterns...",
  "Scanning uploads...",
  "Finalizing report...",
];

/** IAM catalogue (extended fields for SOC admin console — separate from auth directory). */
const INITIAL_IAM_USERS = [
  {
    id: "u1",
    name: "Admin Operator",
    email: "admin@test.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2026-05-03 09:10",
    devices: "3",
    joined: "2024-08-11",
    ips: ["10.1.1.20", "192.168.4.20"],
    uploads: 1245,
    failedLogins: 1,
    locations: ["Berlin, DE", "Amsterdam, NL"],
    notes: "",
    riskSeries: [55, 70, 68, 82, 78, 90, 94],
    activity: [
      { id: "a1", title: "MFA assertion accepted from trusted POP eu-west", iconKey: "shield", ts: Date.now() - 120000 },
      { id: "a2", title: "Policy bundle pushed: IAM-2026.05 enforced", iconKey: "cog", ts: Date.now() - 840000 },
      { id: "a3", title: "Break-glass access not used (telemetry nominal)", iconKey: "activity", ts: Date.now() - 3600000 },
    ],
  },
  {
    id: "u2",
    name: "User Analyst",
    email: "user@test.com",
    role: "Analyst",
    status: "Active",
    lastLogin: "2026-05-03 10:31",
    devices: "2",
    joined: "2025-02-16",
    ips: ["10.1.1.34"],
    uploads: 244,
    failedLogins: 2,
    locations: ["London, UK"],
    notes: "",
    riskSeries: [48, 52, 50, 60, 55, 70, 78],
    activity: [
      { id: "b1", title: "Correlation query executed on signalling metadata", iconKey: "activity", ts: Date.now() - 180000 },
      { id: "b2", title: "Export policy acknowledged via northbound ACK", iconKey: "shield", ts: Date.now() - 900000 },
    ],
  },
  {
    id: "u3",
    name: "SOC Viewer",
    email: "soc.viewer@test.com",
    role: "Viewer",
    status: "Suspended",
    lastLogin: "2026-05-02 19:04",
    devices: "1",
    joined: "2025-07-01",
    ips: ["185.23.11.92"],
    uploads: 19,
    failedLogins: 7,
    locations: ["Madrid, ES"],
    notes: "",
    riskSeries: [40, 38, 35, 42, 45, 50, 52],
    activity: [
      { id: "c1", title: "Session risk score exceeded threshold → suspended by policy", iconKey: "alert", ts: Date.now() - 7200000 },
      { id: "c2", title: "Abnormal SSO timing from new ASN", iconKey: "alert", ts: Date.now() - 86400000 },
    ],
  },
  {
    id: "u4",
    name: "Cloud Reviewer",
    email: "reviewer@test.com",
    role: "User",
    status: "Active",
    lastLogin: "2026-05-03 08:28",
    devices: "4",
    joined: "2025-11-04",
    ips: ["172.16.0.18", "172.16.0.32"],
    uploads: 502,
    failedLogins: 0,
    locations: ["New York, US", "Boston, US"],
    notes: "",
    riskSeries: [62, 64, 65, 72, 70, 80, 85],
    activity: [
      { id: "d1", title: "Uploaded object passed malware screening", iconKey: "shield", ts: Date.now() - 600000 },
      { id: "d2", title: "Device posture certificate renewed", iconKey: "cog", ts: Date.now() - 5400000 },
    ],
  },
];

let iamUsers = JSON.parse(JSON.stringify(INITIAL_IAM_USERS));

function iamRelativeTime(ts) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function iamPushActivity(userRef, title, iconKey = "activity") {
  if (!userRef.activity) userRef.activity = [];
  userRef.activity.unshift({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: sanitizePlainText(String(title ?? ""), 280),
    iconKey: sanitizePlainText(String(iconKey ?? ""), 32),
    ts: Date.now(),
  });
  userRef.activity = userRef.activity.slice(0, 40);
}

function iamPublicRow(u) {
  return {
    id: u.id,
    name: sanitizePlainText(String(u.name ?? ""), 200),
    email: sanitizePlainText(String(u.email ?? "").toLowerCase(), 254),
    role: u.role,
    status: u.status,
    lastLogin: sanitizePlainText(String(u.lastLogin ?? ""), 40),
    devices: sanitizePlainText(String(u.devices ?? ""), 4),
    joined: sanitizePlainText(String(u.joined ?? ""), 32),
    ips: Array.isArray(u.ips) ? u.ips.map((ip) => sanitizePlainText(String(ip), 45)) : [],
    uploads: Number(u.uploads) || 0,
    score: computeSecurityScore(u),
    failedLogins: Number(u.failedLogins) || 0,
    locations: Array.isArray(u.locations)
      ? u.locations.map((loc) => sanitizePlainText(String(loc), 120))
      : [],
    notes: sanitizePlainText(String(u.notes ?? ""), 2000),
    soarSandboxIsolated: Boolean(u.soarSandboxIsolated),
  };
}

function findIamUserOrThrow(id) {
  const u = iamUsers.find((row) => row.id === sanitizePlainText(String(id), 64));
  if (!u) throw new ApiError("User not found.", { status: 404 });
  return u;
}

/** @param {string} callerRole auth role: admin | user */
function iamAssertCallerRoleMutation(callerRole, targetPrevRole, nextRole, mode) {
  const cRaw = String(callerRole ?? "admin").toLowerCase();
  const callerR = callerRankFromAuthRole(cRaw);
  if (cRaw !== "admin" && nextRole !== "User") {
    throw new ApiError("Insufficient privilege — only administrators assign privileged roles.", { status: 403 });
  }
  if (!APP_ROLES.includes(nextRole)) {
    throw new ApiError("Invalid application role.", { status: 400 });
  }
  if (mode === "create") {
    if (!canAssignAppRole(callerR, nextRole)) throw new ApiError("Role assignment forbidden by policy.", { status: 403 });
    return;
  }
  if (!canChangeTargetRole(callerR, targetPrevRole, nextRole)) {
    throw new ApiError("Privilege escalation blocked for this administrator context.", { status: 403 });
  }
}

/** --- Mutable simulated southbound state (resets on full page reload) --- */
let liveThreats = INITIAL_THREATS.map((t) => ({ ...t }));
let liveLogs = buildInitialAuditCatalog();
const blockedIpSet = new Set(["185.23.11.92", "91.80.27.9"]);
const revokedPrincipalSet = new Set();
/** @type {object[]} */
let siemAnalystActions = [];
/** SOAR lifecycle overlay keyed by correlated incident id (shared with Logs buffer). */
const soarLifecycleOverlay = new Map();
const soarInvestigationIds = new Set();
/** @type {object[]} */
let soarAuditEntries = [];
/** Automated playbook executions (immutable append). */
/** @type {object[]} */
let playbookAuditEntries = [];
const playbookFiredKeys = new Set();
const slaAnnouncementIds = new Set();
let activeSessions = 214;
let streamIteration = 0;

/** Security Control Center persisted snapshot (SOC governance plane simulation). */
let securityGovernance = JSON.parse(JSON.stringify(SECURITY_GOVERNANCE_DEFAULTS));
/** @type {object[]} */
let governanceAuditLog = [];
/** @type {object[]} */
let governanceNotificationOutbox = [];
const governanceThreatNotifySeen = new Set();

function ingestGovernanceBias() {
  return { threatSensitivity: Number(securityGovernance.security.threatSensitivity) || 76 };
}

function telemetrySensitivityBoost() {
  return (Number(securityGovernance.security.threatSensitivity) || 76) / 95;
}

function snapshotGovernanceForApi() {
  return {
    ...JSON.parse(JSON.stringify(securityGovernance)),
    generatedAt: new Date().toISOString(),
  };
}

function readSocEnvelope(body) {
  const actor = sanitizePlainText(String(body?.actor ?? body?.actorEmail ?? ""), 254).trim() || "unknown.principal";
  const socRole = normalizeSocRole(body?.socRole ?? body?.socPersona);
  return { actor, socRole };
}

function assertSocCapability(body, capability) {
  const { socRole } = readSocEnvelope(body ?? {});
  if (!socMay(socRole, capability)) {
    throw new ApiError(`RBAC denial — persona ${socRole} cannot ${sanitizePlainText(String(capability), 64)}.`, {
      status: 403,
    });
  }
}

function rbacMatrixAllows(facet, socRole) {
  const tier = normalizeSocRole(socRole);
  const row = securityGovernance?.rbacMatrix?.[facet];
  if (!row) return false;
  return Boolean(row[tier]);
}

function diffGovernanceObjects(prevRoot, nextRoot) {
  /** @type {{ path: string, oldValue: unknown, newValue: unknown }[]} */
  const changes = [];
  const zones = ["security", "notifications", "integrations", "rbacMatrix"];
  for (const zone of zones) {
    const prevZone = prevRoot?.[zone] ?? {};
    const nextZone = nextRoot?.[zone] ?? {};
    const keys = new Set([...Object.keys(prevZone), ...Object.keys(nextZone)]);
    for (const key of keys) {
      const before = prevZone[key];
      const after = nextZone[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ path: `${zone}.${key}`, oldValue: before, newValue: after });
      }
    }
  }
  return changes;
}

function pushGovernanceAudit({ actor, actorSocRole, action, summary, changes }) {
  governanceAuditLog.unshift({
    id: `gov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor: sanitizePlainText(String(actor ?? ""), 254),
    actorSocRole: normalizeSocRole(actorSocRole),
    action: sanitizePlainText(String(action ?? ""), 40),
    summary: sanitizePlainText(String(summary ?? ""), 480),
    changes: cloneJson(Array.isArray(changes) ? changes : []),
  });
  governanceAuditLog = governanceAuditLog.slice(0, 240);
}

function dispatchGovernanceNotificationBridge(alert, reasonTag) {
  if (!alert || !shouldEmitGovernanceNotification(securityGovernance.notifications, alert)) return;
  if (governanceThreatNotifySeen.has(alert.id)) return;
  governanceThreatNotifySeen.add(alert.id);
  if (governanceThreatNotifySeen.size > 600) {
    governanceThreatNotifySeen.clear();
    governanceThreatNotifySeen.add(alert.id);
  }
  const payloads = buildSimulatedOutboundMessages(
    securityGovernance.integrations,
    securityGovernance.notifications,
    alert,
    reasonTag,
  );
  for (const payload of payloads) {
    governanceNotificationOutbox.unshift({
      id: `gn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      severity: sanitizePlainText(String(alert.severity ?? ""), 32),
      channel: sanitizePlainText(String(payload.channel ?? ""), 32),
      text: sanitizePlainText(String(payload.text ?? ""), 520),
      threatId: sanitizePlainText(String(alert.id ?? ""), 120),
      reasonTag: sanitizePlainText(String(reasonTag ?? ""), 64),
    });
  }
  governanceNotificationOutbox = governanceNotificationOutbox.slice(0, 260);
}

/** Carrier-grade ingestion lab (immutable pipeline rows + durable audit ledger). */
let uploadSecurityJobs = [];
/** @type {object[]} */
let uploadSecurityAudit = [];

function appendUploadLifecycle(job, phase, label, detail) {
  if (!job) return;
  if (!Array.isArray(job.lifecycle)) job.lifecycle = [];
  job.lifecycle.push({
    phase: sanitizePlainText(String(phase), 72),
    label: sanitizePlainText(String(label), 160),
    detail: sanitizePlainText(String(detail), 460),
    at: new Date().toISOString(),
  });
  job.lifecycle = job.lifecycle.slice(-48);
}

function pushUploadSecurityAudit(actor, uploadId, action, detail, extra = {}) {
  /** @type {Record<string, string>} */
  const safeExtra = {};
  for (const [k, raw] of Object.entries(extra)) {
    safeExtra[String(k)] = typeof raw === "string" ? sanitizePlainText(raw, 360) : String(raw);
  }
  const entry = {
    id: `usa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actor: sanitizePlainText(String(actor ?? ""), 254),
    uploadId: sanitizePlainText(String(uploadId ?? ""), 96),
    action: sanitizePlainText(String(action ?? ""), 64),
    detail: sanitizePlainText(String(detail ?? ""), 460),
    ...safeExtra,
  };
  uploadSecurityAudit = [entry, ...uploadSecurityAudit].slice(0, 220);
  return entry;
}

function hydrateUploadSecurityLabFromCatalog() {
  const seeds = [
    { id: "upl-seed-u1", fileName: "finance_q4.csv", uploadedByEmail: "user@test.com", sizeMb: 4.2 },
    { id: "upl-seed-u2", fileName: "sales_dump.json", uploadedByEmail: "admin@test.com", sizeMb: 1.8 },
    { id: "upl-seed-u3", fileName: "legacy_script.exe", uploadedByEmail: "user@test.com", sizeMb: 0.62 },
    { id: "upl-seed-u4", fileName: "incident_report.pdf", uploadedByEmail: "soc.viewer@test.com", sizeMb: 2.4 },
    { id: "upl-seed-u5", fileName: "archive_dump.zip", uploadedByEmail: "reviewer@test.com", sizeMb: 15.7 },
  ];
  return seeds.map((row) => buildProcessedIngestionJob(row, ingestGovernanceBias()));
}

uploadSecurityJobs = hydrateUploadSecurityLabFromCatalog();

function snapshotUploadSecurity() {
  return {
    generatedAt: new Date().toISOString(),
    pipelineSchema: INGEST_PIPELINE_STEPS.map((row) => ({ ...row })),
    jobs: cloneJson(uploadSecurityJobs.slice(0, 80)),
    audit: cloneJson(uploadSecurityAudit.slice(0, 160)),
  };
}

function findUploadSecurityJobOrThrow(id) {
  const sid = sanitizePlainText(String(id ?? ""), 96);
  const job = uploadSecurityJobs.find((row) => row.id === sid);
  if (!job) throw new ApiError("Ingestion job not found in POP buffer.", { status: 404 });
  return job;
}

function assertLabIngestEnvelope(fileNameRaw, sizeMbHint) {
  const name = sanitizeUploadFileName(fileNameRaw);
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot >= name.length - 1) {
    throw new ApiError("Ingress requires a sanitized filename with trailing extension.", { status: 400 });
  }
  const ext = name.slice(dot + 1).toLowerCase();
  const allowedExt = new Set([
    "csv",
    "pdf",
    "json",
    "zip",
    "bat",
    "exe",
    "txt",
    "xml",
    "dat",
    "msi",
    "dll",
    "log",
    "gz",
    "rar",
    "ps1",
  ]);
  if (!allowedExt.has(ext) || ext.length > 18) {
    throw new ApiError("Extension barred by ingestion POP classifier.", { status: 400 });
  }
  let sizeMb = Number(sizeMbHint);
  if (!Number.isFinite(sizeMb)) sizeMb = 2;
  sizeMb = Math.min(155, Math.max(0.01, sizeMb));
  return { name, sizeMb };
}

const streamSubscribers = new Set();
let streamTimerId = null;

async function networkLatency() {
  const span = Math.max(0, MAX_LATENCY_MS - MIN_LATENCY_MS);
  await delay(MIN_LATENCY_MS + Math.random() * span);
}

function maybeThrowSimulatedFailure(path) {
  const rate = Number.isFinite(DEFAULT_FAILURE_RATE) ? DEFAULT_FAILURE_RATE : 0;
  if (rate <= 0) return;
  if (Math.random() < rate) {
    const codes = [502, 503, 504];
    const status = codes[Math.floor(Math.random() * codes.length)];
    throw new ApiError(`SOC gateway ${status} on ${path} (simulated)`, { status, body: { path, simulated: true } });
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

const PLAYBOOK_IDS = Object.freeze({
  BF_AUTO_BLOCK: "pb_bruteforce_autoblock_v1",
  MALWARE_CRITICAL_ISOLATE: "pb_malware_critical_isolate_v1",
  UPLOAD_THREAT_BRIDGE: "pb_upload_threat_soar_bridge_v1",
});

const POP_INGEST_SYNTHESIS = Object.freeze([
  { stem: "northbound_cdr", suffix: ".csv", mb: () => 0.5 + Math.random() * 6 },
  { stem: "bss_export", suffix: ".json", mb: () => 0.2 + Math.random() * 4 },
  { stem: "customer_statement", suffix: ".pdf", mb: () => 0.35 + Math.random() * 2 },
  { stem: "cell_site_bundle", suffix: ".zip", mb: () => 2 + Math.random() * 19 },
  { stem: "automation_rollout", suffix: ".bat", mb: () => 0.05 + Math.random() * 0.12 },
  { stem: "field_engine_tool", suffix: ".exe", mb: () => 0.12 + Math.random() * 0.7 },
]);

function slaBudgetFromOverlay(overlay) {
  const n = Number(overlay?.slaMinutes);
  return Number.isFinite(n) && n > 0 ? n : 90;
}

function revokeIncidentAutomationKeys(incidentId) {
  const sid = sanitizePlainText(String(incidentId ?? ""), 140);
  const prefix = `${sid}:`;
  for (const key of [...playbookFiredKeys]) {
    if (key.startsWith(prefix)) playbookFiredKeys.delete(key);
  }
  slaAnnouncementIds.delete(sid);
}

function pushPlaybookAudit({ ruleId, incidentId, outcome, detail, targetIp }) {
  playbookAuditEntries.unshift({
    id: `pb-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ruleId: sanitizePlainText(String(ruleId ?? ""), 64),
    incidentId: sanitizePlainText(String(incidentId ?? ""), 120),
    outcome: sanitizePlainText(String(outcome ?? ""), 120),
    detail: sanitizePlainText(String(detail ?? ""), 440),
    targetIp: sanitizePlainText(String(targetIp ?? ""), 45),
    automation: true,
  });
  playbookAuditEntries = playbookAuditEntries.slice(0, 220);
}

function notifyIamForSinkholeIp(ipRaw, reason) {
  const ip = sanitizePlainText(String(ipRaw ?? ""), 45).trim();
  if (!ip) return;
  iamUsers.forEach((u) => {
    if (!Array.isArray(u.ips)) return;
    if (!u.ips.some((existing) => sanitizePlainText(String(existing), 45) === ip)) return;
    iamPushActivity(
      u,
      sanitizePlainText(reason ?? `SOAR/IP intel: ${ip} sinkholed — IAM asset touched shared fabric`, 280),
      "shield",
    );
    u.failedLogins = Number(u.failedLogins ?? 0) + 1;
    if (Array.isArray(u.riskSeries) && u.riskSeries.length > 0) {
      const tail = u.riskSeries[u.riskSeries.length - 1];
      u.riskSeries = [...u.riskSeries.slice(-11), Math.min(100, Math.round(Number(tail) || 50) + 12)];
    }
  });
}

function isolatePrincipalsForMalwareIncident(incident, logById) {
  const emails = new Set();
  for (const lid of incident.sourceLogIds ?? []) {
    const row = logById.get(lid);
    if (!row) continue;
    const em = sanitizePlainText(String(row.email ?? ""), 254).trim().toLowerCase();
    if (!em || em === "-" || em === "unknown") continue;
    emails.add(em);
  }

  emails.forEach((mail) => {
    const u = iamUsers.find((owner) => String(owner.email ?? "").toLowerCase() === mail);
    if (!u) return;
    u.soarSandboxIsolated = true;
    iamPushActivity(
      u,
      `SOAR/Malware playbook · egress isolated pending verdict (${mail})`,
      "alert",
    );
  });
}

/** Deterministic SOAR automations (telecom-style runbooks). */
function runAutomaticPlaybooks(incidents, logById) {
  for (const inc of incidents) {
    const id = sanitizePlainText(String(inc.id ?? ""), 140);
    const overlay = soarLifecycleOverlay.get(id) ?? {};
    const lifecycle = overlay.lifecycle ?? inc.lifecycle ?? SOAR_LIFECYCLE.DETECTED;

    if (
      overlay.dismissed ||
      lifecycle === SOAR_LIFECYCLE.CLOSED ||
      lifecycle === SOAR_LIFECYCLE.MITIGATED
    ) {
      continue;
    }

    const incType = String(inc.type ?? "");

    if (/Brute Force Attack/i.test(incType) && lifecycle === SOAR_LIFECYCLE.DETECTED) {
      const fk = `${id}:${PLAYBOOK_IDS.BF_AUTO_BLOCK}`;
      if (playbookFiredKeys.has(fk)) continue;
      playbookFiredKeys.add(fk);

      const ipSan = sanitizePlainText(String(inc.ip ?? ""), 45);
      if (ipSan && isProbablyIpv4(ipSan)) blockedIpSet.add(ipSan);

      soarLifecycleOverlay.set(id, {
        ...overlay,
        lifecycle: SOAR_LIFECYCLE.MITIGATED,
        dismissed: false,
        priority: overlay.priority ?? "normal",
        resolution: "playbook_bf_autoblock",
        automatedReason: PLAYBOOK_IDS.BF_AUTO_BLOCK,
        playbookBanner: "Automated sinkhole (brute-force runbook)",
        updatedAt: new Date().toISOString(),
      });
      soarInvestigationIds.delete(id);

      pushPlaybookAudit({
        ruleId: PLAYBOOK_IDS.BF_AUTO_BLOCK,
        incidentId: id,
        outcome: "sinkhole_applied",
        detail: "Auto-block abusive IP per brute-force correlation.",
        targetIp: ipSan,
      });
      notifyIamForSinkholeIp(ipSan, `Playbook ${PLAYBOOK_IDS.BF_AUTO_BLOCK}`);
      pushSoarAudit(
        "system/playbook-runner",
        id,
        "playbook_execute",
        `Rule ${PLAYBOOK_IDS.BF_AUTO_BLOCK} mitigated host ${ipSan}`,
        ipSan,
      );
      continue;
    }

    if (/Malware Upload Campaign/i.test(incType) && lifecycle === SOAR_LIFECYCLE.DETECTED) {
      const fk = `${id}:${PLAYBOOK_IDS.MALWARE_CRITICAL_ISOLATE}`;
      if (playbookFiredKeys.has(fk)) continue;
      playbookFiredKeys.add(fk);

      soarLifecycleOverlay.set(id, {
        ...overlay,
        lifecycle: SOAR_LIFECYCLE.INVESTIGATING,
        dismissed: false,
        priority: "elevated",
        severityOverride: "Critical",
        playbookBanner: "Automated IR · malware upload isolate",
        automatedReason: PLAYBOOK_IDS.MALWARE_CRITICAL_ISOLATE,
        updatedAt: new Date().toISOString(),
      });
      soarInvestigationIds.add(id);
      isolatePrincipalsForMalwareIncident(inc, logById);

      pushPlaybookAudit({
        ruleId: PLAYBOOK_IDS.MALWARE_CRITICAL_ISOLATE,
        incidentId: id,
        outcome: "isolate_accounts",
        detail: "Critical severity + principal sandbox isolation.",
        targetIp: sanitizePlainText(String(inc.ip ?? ""), 45),
      });
      pushSoarAudit(
        "system/playbook-runner",
        id,
        "playbook_execute",
        `Rule ${PLAYBOOK_IDS.MALWARE_CRITICAL_ISOLATE}`,
        inc.ip,
      );
    }
  }
}

function enforceSlaEscalations(incidents) {
  const nowMs = Date.now();

  for (const inc of incidents) {
    const id = sanitizePlainText(String(inc.id ?? ""), 140);
    const overlay = soarLifecycleOverlay.get(id) ?? {};
    const lifecycle = overlay.lifecycle ?? inc.lifecycle ?? SOAR_LIFECYCLE.DETECTED;
    if (
      overlay.dismissed ||
      lifecycle === SOAR_LIFECYCLE.CLOSED ||
      lifecycle === SOAR_LIFECYCLE.MITIGATED
    )
      continue;

    const detectedTs = Date.parse(String(inc.detectedAtIso ?? ""));
    if (!Number.isFinite(detectedTs)) continue;

    const minutesOpen = (nowMs - detectedTs) / 60000;
    const budget = slaBudgetFromOverlay(overlay);

    if (minutesOpen <= budget || slaAnnouncementIds.has(id)) continue;

    slaAnnouncementIds.add(id);

    const nextTier = Number(overlay.escalationTier ?? 1) + 1;
    soarLifecycleOverlay.set(id, {
      ...overlay,
      priority: "escalated",
      escalationTier: Math.min(5, nextTier),
      slaBreached: true,
      updatedAt: new Date().toISOString(),
    });

    pushSoarAudit(
      "system/sla-orchestrator",
      id,
      "sla_breach",
      `SLA · ${Math.round(minutesOpen)}m open / ${budget}m budget → tier ${Math.min(5, nextTier)}`,
      sanitizePlainText(String(inc.ip ?? ""), 45),
    );

    liveThreats.unshift({
      id: `SLA-${streamIteration}-${Math.random().toString(36).slice(2, 6)}`,
      message: sanitizePlainText(`Incident ${id} breached SLA — escalated to tier ${Math.min(5, nextTier)}`, 420),
      severity: "High",
      ago: "live",
      dismissed: false,
    });
    liveThreats = liveThreats.slice(0, 12);
  }
}

function enrichIncidentRuntime(inc) {
  const id = inc.id;
  const overlay = soarLifecycleOverlay.get(id) ?? {};
  const detectedTs = Date.parse(String(inc.detectedAtIso ?? ""));
  const minutesOpen =
    Number.isFinite(detectedTs) && detectedTs > 0
      ? Math.max(0, Math.floor((Date.now() - detectedTs) / 60000))
      : 0;

  const slaBudgetMinutes = slaBudgetFromOverlay(overlay);

  const lifecycle = overlay.lifecycle ?? inc.lifecycle ?? SOAR_LIFECYCLE.DETECTED;
  const breached =
    !overlay.dismissed &&
    (lifecycle === SOAR_LIFECYCLE.DETECTED || lifecycle === SOAR_LIFECYCLE.INVESTIGATING) &&
    minutesOpen > slaBudgetMinutes;

  const consumedPct = Math.min(100, Math.round((minutesOpen / Math.max(1, slaBudgetMinutes)) * 100));

  const severity = overlay.severityOverride ?? inc.severity;

  return {
    ...inc,
    severity,
    lifecycle,
    priority: overlay.priority ?? inc.priority ?? "normal",
    dismissed: Boolean(overlay.dismissed ?? inc.dismissed),
    resolution: sanitizePlainText(String(overlay.resolution ?? inc.resolution ?? ""), 240),
    assignedToEmail: sanitizePlainText(String(overlay.assignedTo ?? ""), 254),
    minutesOpen,
    slaBudgetMinutes,
    slaConsumedPercent: consumedPct,
    slaBreached: Boolean(breached || overlay.slaBreached),
    escalationTier: Math.min(5, Number(overlay.escalationTier ?? 1) || 1),
    playbookBanner: sanitizePlainText(String(overlay.playbookBanner ?? overlay.automatedReason ?? ""), 280),
    correlationKeys: Array.isArray(inc.correlationKeys) ? inc.correlationKeys : [],
    principal: inc.principal ? sanitizePlainText(String(inc.principal), 254) : "",
  };
}

function buildSoarSnapshotPayload() {
  const normalizedLogs = liveLogs.map((row) => normalizeAuditLog(row));
  const logById = new Map(normalizedLogs.map((row) => [row.id, row]));

  const lifecycleAdapter = { get: (id) => soarLifecycleOverlay.get(id) };

  let incidents = correlateIncidentsFromLogs(normalizedLogs, lifecycleAdapter);
  runAutomaticPlaybooks(incidents, logById);
  incidents = correlateIncidentsFromLogs(normalizedLogs, lifecycleAdapter);
  enforceSlaEscalations(incidents);
  incidents = correlateIncidentsFromLogs(normalizedLogs, lifecycleAdapter);

  incidents = incidents.map(enrichIncidentRuntime).map((inc) => ({
    ...inc,
    inInvestigationQueue: soarInvestigationIds.has(inc.id),
  }));

  let attackMix = buildAttackMix(incidents);
  if (!attackMix.length)
    attackMix = [{ name: "No correlated campaigns", value: 100, raw: 0, color: "#475569" }];

  let timeline = buildThreatTimeline(incidents);
  if (timeline.length < 2) {
    timeline = [
      { time: `${String(new Date().getHours()).padStart(2, "0")}:00`, threats: Math.max(1, incidents.length) },
      ...timeline,
    ].slice(-8);
  }
  const topCountries = buildTopCountriesFromLogs(normalizedLogs);
  const mapPoints = buildMapPoints(incidents, normalizedLogs);

  const feedFromIncidents = incidents
    .filter(
      (i) =>
        !i.dismissed &&
        i.lifecycle !== SOAR_LIFECYCLE.CLOSED &&
        i.priority !== "low" &&
        (i.lifecycle === SOAR_LIFECYCLE.DETECTED ||
          i.lifecycle === SOAR_LIFECYCLE.INVESTIGATING ||
          i.inInvestigationQueue),
    )
    .slice(0, 10)
    .map((i) => ({
      id: `SOAR-FEED-${i.id}`,
      text: i.headline,
      severity: i.severity,
      time: timeAgoFromIso(i.lastSeenIso),
      source: "correlation",
    }));

  const feedFromAlerts = liveThreats.slice(0, 8).map((t) => ({
    id: t.id,
    text: t.message,
    severity: t.severity,
    time: t.ago ?? "recent",
    source: "signature",
  }));

  const unifiedFeed = [...feedFromIncidents, ...feedFromAlerts].slice(0, 18);

  const detecting = incidents.filter(
    (i) => !i.dismissed && i.lifecycle === SOAR_LIFECYCLE.DETECTED && i.priority !== "low",
  ).length;
  const investigating = incidents.filter((i) => i.lifecycle === SOAR_LIFECYCLE.INVESTIGATING).length;
  const mitigated = incidents.filter((i) => i.lifecycle === SOAR_LIFECYCLE.MITIGATED).length;
  const closed = incidents.filter(
    (i) => i.lifecycle === SOAR_LIFECYCLE.CLOSED || i.dismissed || i.priority === "low",
  ).length;

  const globalRiskScore = summarizeGlobalRisk(incidents);
  const suspiciousSessions = incidents.reduce((s, i) => s + (i.attempts || 0), 0);

  const eligibleAssignees = iamUsers
    .map((raw) => {
      const pub = iamPublicRow(raw);
      return { email: pub.email, name: pub.name };
    })
    .filter((row) => row.email);

  return {
    generatedAt: new Date().toISOString(),
    iterations: streamIteration,
    incidents,
    unifiedFeed,
    attackMix,
    timeline,
    topCountries:
      topCountries.length > 0
        ? topCountries
        : [
            { country: "Singapore", count: 6 },
            { country: "Netherlands", count: 5 },
          ],
    mapPoints,
    metrics: {
      detecting,
      investigating,
      mitigated,
      closed,
      suspiciousSessions,
      globalRiskScore,
    },
    activeInvestigations: [...soarInvestigationIds],
    auditTrail: soarAuditEntries.slice(0, 40).map((e) => ({ ...e })),
    playbookAudit: playbookAuditEntries.slice(0, 40).map((e) => ({ ...e })),
    eligibleAssignees,
    blockedIpCount: blockedIpSet.size,
  };
}

function timeAgoFromIso(iso) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "recent";
  const m = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (m < 120) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function pushSoarAudit(actor, incidentId, action, detail, ipHint = "") {
  const entry = {
    id: `soar-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: sanitizePlainText(String(actor ?? "unknown"), 254),
    incidentId: sanitizePlainText(String(incidentId ?? ""), 96),
    action: sanitizePlainText(String(action ?? ""), 32),
    detail: sanitizePlainText(String(detail ?? ""), 400),
    targetIp: sanitizePlainText(String(ipHint ?? ""), 45),
  };
  soarAuditEntries = [entry, ...soarAuditEntries].slice(0, 200);
  return entry;
}

function bridgeUploadThreatToSoarFabric(actor, job, note = "") {
  const uploadRef = sanitizePlainText(String(job.id ?? ""), 96);
  const headline = sanitizePlainText(
    `Cloud POP ingest · ${job.fileName} · disposition ${String(job.finalDecision ?? "").toUpperCase()} · scan=${job.scanResult}`,
    420,
  );
  const sev = job.scanResult === "Threat" || job.finalDecision === "block" ? "Critical" : "High";
  const threatAlertId = `UP-${uploadRef.slice(0, 18)}-${Math.random().toString(36).slice(2, 7)}`;
  liveThreats.unshift({
    id: threatAlertId,
    message: headline,
    severity: sev,
    ago: "live",
    dismissed: false,
    uploadCorrelationId: uploadRef,
  });
  liveThreats = liveThreats.slice(0, 14);
  if (job) {
    job.linkedThreatAlertId = threatAlertId;
    appendUploadLifecycle(
      job,
      "soc_threat_publish",
      "Threat Monitor / SOAR bridge",
      sanitizePlainText(`Correlated SOC alert · ${threatAlertId}`, 320),
    );
  }

  pushSoarAudit(
    sanitizePlainText(String(actor ?? "system.bridge"), 254),
    `UPLOAD-${uploadRef}`,
    "upload_bridge",
    note ||
      sanitizePlainText(
        `Orchestration fan-out · ${job.fileName} · malware=${job.malware?.verdict ?? "unknown"} composite=${job.compositeRisk}`,
        400,
      ),
    "",
  );

  pushPlaybookAudit({
    ruleId: PLAYBOOK_IDS.UPLOAD_THREAT_BRIDGE,
    incidentId: `UPLOAD-${uploadRef}`,
    outcome: "threat_publish",
    detail: sanitizePlainText(`TELEM upload bridge · correlated job ${job.id}`, 440),
    targetIp: "",
  });

  siemAnalystActions = [
    {
      id: `siem-up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      kind: "upload_bridge",
      actor: sanitizePlainText(String(actor ?? "system.bridge"), 254),
      logId: uploadRef,
      targetIp: "",
      detail: headline,
      ack: true,
    },
    ...siemAnalystActions,
  ].slice(0, 200);
  return threatAlertId;
}

/** @returns {null | ReturnType<typeof buildProcessedIngestionJob>} */
function enqueueSyntheticUploadIngress(channel) {
  if (uploadSecurityJobs.length >= 78) return null;
  const pick = POP_INGEST_SYNTHESIS[Math.floor(Math.random() * POP_INGEST_SYNTHESIS.length)];
  const principal = USER_DIRECTORY[Math.floor(Math.random() * USER_DIRECTORY.length)];
  const id = `upl-pop-${streamIteration}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `${pick.stem}_${Math.floor(Math.random() * 900 + 100)}${pick.suffix}`;
  const sizeMb = pick.mb();
  const job = buildProcessedIngestionJob(
    {
      id,
      fileName,
      uploadedByEmail: principal.email,
      sizeMb,
    },
    ingestGovernanceBias(),
  );
  uploadSecurityJobs = [job, ...uploadSecurityJobs].slice(0, 80);
  pushUploadSecurityAudit(
    channel === "stream" ? "system/pop-gateway" : "operator/lab",
    id,
    channel === "stream" ? "synthetic_pop_enqueue" : "manual_pop_enqueue",
    sanitizePlainText(`Synthetic carrier workload · ${fileName}`, 240),
  );
  if (job.finalDecision === "block" || job.scanResult === "Threat") {
    bridgeUploadThreatToSoarFabric(
      "system/upload-correlator",
      job,
      sanitizePlainText(`Auto-correlation from ${channel} · score ${job.malware?.score ?? 0}`, 360),
    );
    job.threatEscalated = true;
    job.threatEscalatedBy = "system/upload-correlator";
  }
  return job;
}

function broadcastStream() {
  streamIteration += 1;
  const threatPatch = patchThreatAlerts([...liveThreats], {
    iteration: streamIteration,
    threatSensitivity: Number(securityGovernance.security.threatSensitivity) || 76,
  });
  liveThreats = threatPatch.list;
  if (threatPatch.spawned) {
    dispatchGovernanceNotificationBridge(threatPatch.spawned, "live_stream_spawn");
  }
  liveLogs = patchLiveLogs([...liveLogs], streamIteration, telemetrySensitivityBoost());
  activeSessions = jitterSessions(activeSessions, streamIteration);

  const soarSnapshot = buildSoarSnapshotPayload();

  if (uploadSecurityJobs.length < 76 && Math.random() < 0.28) {
    enqueueSyntheticUploadIngress("stream");
  }

  const payload = {
    iteration: streamIteration,
    logs: liveLogs.map((r) => ({ ...r })),
    threats: liveThreats.map((t) => ({ ...t })),
    activeSessions,
    blockedIps: [...blockedIpSet],
    soarSnapshot,
    uploadSecurity: snapshotUploadSecurity(),
    governance: snapshotGovernanceForApi(),
    governanceNotifications: governanceNotificationOutbox.slice(0, 18).map((n) => ({ ...n })),
  };
  streamSubscribers.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore subscriber faults */
    }
  });
}

/**
 * Mock WebSocket / SSE fan-out. Returns unsubscribe.
 * @param {(payload: object) => void} handler
 */
export function subscribeSocStream(handler, intervalMs = 5500) {
  streamSubscribers.add(handler);
  if (streamTimerId == null) {
    streamTimerId = window.setInterval(broadcastStream, intervalMs);
  }
  return () => {
    streamSubscribers.delete(handler);
    if (streamSubscribers.size === 0 && streamTimerId != null) {
      window.clearInterval(streamTimerId);
      streamTimerId = null;
    }
  };
}

/** @param {string} path */
export async function apiClient(method, path, options = {}) {
  if (!env.useMockApi) {
    throw new ApiError("Simulated SOC client only — set VITE_USE_MOCK_API=true for lab mode.", { status: 501 });
  }

  const normalized = path.replace(/^\//, "");
  await networkLatency();
  maybeThrowSimulatedFailure(`/${normalized}`);

  if (method === "GET" && normalized === "dashboard/stats") {
    return {
      generatedAt: new Date().toISOString(),
      metricDefinitions: METRIC_DEFINITIONS.map((m) => ({ ...m })),
      chartRanges: cloneJson(CHART_RANGES),
      threatDistribution: THREAT_DISTRIBUTION.map((r) => ({ ...r })),
      healthScore: 92,
      activeSessions,
      adminOperators: USER_DIRECTORY.map((u) => u.displayName),
      revocablePrincipals: USER_DIRECTORY.map((u) => ({
        label: u.displayName,
        value: u.email,
      })),
      blockedIps: [...blockedIpSet],
      scanStages: [...SCAN_STAGES],
    };
  }

  if (method === "GET" && normalized === "logs") {
    return {
      generatedAt: new Date().toISOString(),
      items: liveLogs.map((r) => ({ ...normalizeAuditLog(r) })),
    };
  }

  if (method === "GET" && normalized === "logs/stream") {
    await delay(90 + Math.random() * 240);
    maybeThrowSimulatedFailure("/logs/stream");
    streamIteration += 1;
    liveLogs = patchLiveLogs([...liveLogs], streamIteration, telemetrySensitivityBoost());
    const head = liveLogs[0];
    return {
      generatedAt: new Date().toISOString(),
      events: head ? [{ ...normalizeAuditLog(head) }] : [],
      totalBuffered: liveLogs.length,
      soarSnapshot: buildSoarSnapshotPayload(),
    };
  }

  if (method === "POST" && normalized === "logs/filter") {
    await delay(60 + Math.random() * 180);
    maybeThrowSimulatedFailure("/logs/filter");
    const rawCrit = /** @type {Record<string, string>} */ (options.body?.criteria ?? {});
    const normalizedLive = liveLogs.map((row) => normalizeAuditLog(row));
    const filtered = filterAuditLogs(normalizedLive, {
      q: rawCrit.q,
      severity: rawCrit.severity,
      action: rawCrit.action,
      result: rawCrit.result,
      dateRange: rawCrit.dateRange,
    });
    return {
      generatedAt: new Date().toISOString(),
      count: filtered.length,
      items: filtered.map((r) => ({ ...r })),
    };
  }

  if (method === "GET" && normalized === "logs/analyst-actions") {
    await delay(40 + Math.random() * 120);
    return {
      generatedAt: new Date().toISOString(),
      items: siemAnalystActions.map((e) => ({ ...e })),
    };
  }

  if (method === "POST" && normalized === "logs/action") {
    await delay(70 + Math.random() * 200);
    maybeThrowSimulatedFailure("/logs/action");
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    const kind = sanitizePlainText(String(body.type ?? ""), 32).toLowerCase();
    const allowed = ["block_ip", "mark_incident", "investigate_enqueue"];
    if (!allowed.includes(kind)) {
      throw new ApiError("Unsupported analyst action envelope.", { status: 400 });
    }
    if (kind === "block_ip") {
      assertSocCapability(body, "canSinkholeManual");
      if (!rbacMatrixAllows("blockIp", gate.socRole)) {
        throw new ApiError("RBAC · block_ip denied for this persona / matrix.", { status: 403 });
      }
    } else {
      assertSocCapability(body, "canInvestigateThreat");
    }
    const actor = gate.actor;
    const logId = sanitizePlainText(String(body.logId ?? ""), 64).trim();
    const targetIp = sanitizePlainText(String(body.targetIp ?? ""), 45).trim();
    const entry = {
      id: `siem-act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      kind,
      actor: actor || "unknown.principal",
      logId,
      targetIp,
      detail: sanitizePlainText(String(body.detail ?? ""), 400),
      ack: Math.random() > 0.12,
    };
    siemAnalystActions = [entry, ...siemAnalystActions].slice(0, 200);
    return { ok: true, generatedAt: new Date().toISOString(), entry };
  }

  if (method === "GET" && normalized === "threats") {
    return {
      generatedAt: new Date().toISOString(),
      items: liveThreats.map((t) => ({ ...t })),
    };
  }

  if (method === "GET" && normalized === "governance/settings") {
    await delay(40 + Math.random() * 120);
    return snapshotGovernanceForApi();
  }

  if (method === "GET" && normalized === "governance/audit") {
    await delay(30 + Math.random() * 100);
    return {
      generatedAt: new Date().toISOString(),
      items: cloneJson(governanceAuditLog.slice(0, 120)),
    };
  }

  if (method === "GET" && normalized === "governance/outbox") {
    await delay(30 + Math.random() * 100);
    return {
      generatedAt: new Date().toISOString(),
      items: cloneJson(governanceNotificationOutbox.slice(0, 80)),
    };
  }

  if (method === "GET" && normalized === "governance/export") {
    await delay(50 + Math.random() * 120);
    return {
      schemaVersion: securityGovernance.schemaVersion ?? 1,
      exportedAt: new Date().toISOString(),
      governance: snapshotGovernanceForApi(),
    };
  }

  if (method === "POST" && normalized === "governance/settings") {
    await delay(120 + Math.random() * 220);
    maybeThrowSimulatedFailure("/governance/settings");
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    assertSocCapability(body, "canGovernanceWrite");
    const prev = snapshotGovernanceForApi();
    const patch = /** @type {Record<string, unknown>} */ (body.patch ?? body.delta ?? {});
    const next = mergeGovernance(securityGovernance, patch);
    const changes = diffGovernanceObjects(prev, next);
    securityGovernance = next;
    if (changes.length) {
      pushGovernanceAudit({
        actor: gate.actor,
        actorSocRole: gate.socRole,
        action: "governance_patch",
        summary: `Security Control Center Δ (${changes.length} fields)`,
        changes,
      });
    }
    return { ok: true, governance: snapshotGovernanceForApi(), changesApplied: changes.length };
  }

  if (method === "POST" && normalized === "governance/import") {
    await delay(160 + Math.random() * 240);
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    assertSocCapability(body, "canGovernanceImport");
    const prev = snapshotGovernanceForApi();
    const incoming = /** @type {Record<string, unknown>} */ (body.governance ?? body.payload ?? body);
    if (!incoming || typeof incoming !== "object") {
      throw new ApiError("Provide governance payload envelope.", { status: 400 });
    }
    const rebuilt = JSON.parse(JSON.stringify(SECURITY_GOVERNANCE_DEFAULTS));
    const merged = mergeGovernance(rebuilt, /** @type {Parameters<typeof mergeGovernance>[1]} */ (incoming));
    securityGovernance = merged;
    const changes = diffGovernanceObjects(prev, snapshotGovernanceForApi());
    pushGovernanceAudit({
      actor: gate.actor,
      actorSocRole: gate.socRole,
      action: "governance_import",
      summary: "Full governance snapshot restored from JSON interchange.",
      changes,
    });
    uploadSecurityJobs = hydrateUploadSecurityLabFromCatalog();
    return { ok: true, governance: snapshotGovernanceForApi() };
  }

  if (method === "POST" && normalized === "webhook/threat") {
    await delay(40 + Math.random() * 120);
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const sevRaw = sanitizePlainText(String(body.severity ?? "High"), 32);
    const summary = sanitizePlainText(String(body.summary ?? body.message ?? "External webhook IOC"), 420);
    const correlation = sanitizePlainText(String(body.correlationId ?? `EXT-${Date.now()}`), 120);
    const alertRow = {
      id: sanitizePlainText(String(body.id ?? correlation), 140),
      message: summary,
      severity: sevRaw,
      ago: "webhook",
      dismissed: false,
      sourceWebhook: true,
    };
    liveThreats = [alertRow, ...liveThreats].slice(0, 14);
    dispatchGovernanceNotificationBridge(alertRow, "northbound_webhook");
    pushGovernanceAudit({
      actor: "system/webhook-gateway",
      actorSocRole: "Admin",
      action: "webhook_threat_ingest",
      summary,
      changes: [{ path: `webhook.${correlation}`, oldValue: null, newValue: sevRaw }],
    });
    securityGovernance.integrations.lastOutboundWebhookReceipt = new Date().toISOString();
    return { ok: true, accepted: correlation, alertsBuffered: liveThreats.length };
  }

  if (method === "GET" && normalized === "uploads/security") {
    await delay(40 + Math.random() * 120);
    return snapshotUploadSecurity();
  }

  if (method === "POST" && normalized === "uploads/security/simulate") {
    await delay(90 + Math.random() * 180);
    maybeThrowSimulatedFailure("/uploads/security/simulate");
    const raw = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const actor = sanitizePlainText(String(raw.actor ?? raw.operatorPrincipal ?? ""), 254).trim() || "operator/lab-console";
    const { name, sizeMb } = assertLabIngestEnvelope(String(raw.fileName ?? raw.name ?? ""), Number(raw.sizeMb));
    let uploader = sanitizePlainText(String(raw.uploadedByEmail ?? raw.uploaderEmail ?? ""), 254).trim().toLowerCase();
    if (!uploader.includes("@")) uploader = USER_DIRECTORY[1].email;
    const id = `upl-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const job = buildProcessedIngestionJob(
      {
        id,
        fileName: name,
        uploadedByEmail: uploader,
        sizeMb,
      },
      ingestGovernanceBias(),
    );
    uploadSecurityJobs = [job, ...uploadSecurityJobs].slice(0, 80);
    pushUploadSecurityAudit(actor, id, "manual_file_simulate", `Operator-file lab · ${name}`);
    return { ok: true, job: cloneJson(job), uploadSecurity: snapshotUploadSecurity() };
  }

  if (method === "POST" && normalized === "uploads/security/action") {
    await delay(70 + Math.random() * 190);
    maybeThrowSimulatedFailure("/uploads/security/action");
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    const actor = gate.actor;
    const uploadId = sanitizePlainText(String(body.uploadId ?? ""), 96).trim();
    const action = sanitizePlainText(String(body.action ?? ""), 40).trim().toLowerCase();
    const job = findUploadSecurityJobOrThrow(uploadId);

    if (action === "threat_block") {
      assertSocCapability(body, "canUploadThreatBlock");
      job.blocked = true;
      job.finalDecision = "block";
      job.scanResult = "Threat";
      job.blockedByEmail = sanitizePlainText(actor, 254);
      job.updatedAt = new Date().toISOString();
      job.stages = job.stages.map((s) =>
        s.key === "decision"
          ? {
              ...s,
              status: "fail",
              headline: "Operator · HARD BLOCK enforced at edge",
              detail: sanitizePlainText(`SOC revoke · principal ${actor}`, 360),
            }
          : { ...s },
      );
      /** @type {{ summary?: string; blockReason?: string | null; triggeredRules?: string[] }} */
      const ex = job.explainability ?? {};
      const rules = [...(Array.isArray(ex.triggeredRules) ? ex.triggeredRules : [])];
      if (!rules.includes("SOC-OPER-HARD-BLOCK-V1")) rules.push("SOC-OPER-HARD-BLOCK-V1");
      job.explainability = {
        summary:
          sanitizePlainText(
            `${ex.summary ?? ""} Operator-enforced HARD BLOCK (${actor}).`,
            420,
          ) || sanitizePlainText(`Operator HARD BLOCK by ${actor}.`, 200),
        blockReason: sanitizePlainText(
          `${ex.blockReason ?? "Manual governance hold"} · rule SOC-OPER-HARD-BLOCK-V1`,
          460,
        ),
        triggeredRules: rules,
      };
      appendUploadLifecycle(
        job,
        "operator_block",
        "Manual egress revocation",
        sanitizePlainText(`Blocked by SOC principal ${actor} — explainable HARD STOP`, 380),
      );
      pushUploadSecurityAudit(actor, uploadId, "threat_block", "Object withheld — carrier egress denied.");
      return { ok: true, uploadSecurity: snapshotUploadSecurity() };
    }

    if (action === "threat_send_bridge") {
      assertSocCapability(body, "canUploadThreatBridge");
      bridgeUploadThreatToSoarFabric(actor, job, sanitizePlainText(String(body.note ?? ""), 400));
      job.threatEscalated = true;
      job.threatEscalatedBy = actor;
      job.updatedAt = new Date().toISOString();
      pushUploadSecurityAudit(actor, uploadId, "threat_send_bridge", "Published to Threat Monitor · SOAR + SIEM fan-out.");
      return { ok: true, uploadSecurity: snapshotUploadSecurity() };
    }

    if (action === "review_assign") {
      assertSocCapability(body, "canUploadReviewAssign");
      const assignee = sanitizePlainText(String(body.assigneeEmail ?? ""), 254).trim().toLowerCase();
      if (!assignee.includes("@")) {
        throw new ApiError("assigneeEmail must be present for SOC queue assignment.", { status: 400 });
      }
      job.assignedToEmail = assignee;
      job.assignedByEmail = actor;
      job.investigationStatus = job.investigationStatus === "none" ? "pending" : job.investigationStatus;
      job.updatedAt = new Date().toISOString();
      appendUploadLifecycle(
        job,
        "investigation_assigned",
        "SOC analyst routed",
        sanitizePlainText(`${actor} delegated ownership → ${assignee}`, 380),
      );
      pushUploadSecurityAudit(actor, uploadId, "review_assign", `Owner transfer → ${assignee}`);
      return { ok: true, uploadSecurity: snapshotUploadSecurity() };
    }

    if (action === "review_mark_pending") {
      assertSocCapability(body, "canUploadReviewPending");
      job.investigationStatus = "pending";
      job.pendingMarkedByEmail = actor;
      job.updatedAt = new Date().toISOString();
      job.stages = job.stages.map((s) =>
        s.key === "decision" && job.finalDecision === "review"
          ? {
              ...s,
              detail: sanitizePlainText(`${s.detail ?? ""} · IR backlog marked by ${actor}`, 460),
            }
          : { ...s },
      );
      appendUploadLifecycle(
        job,
        "investigation_pending_marker",
        "Pending structured investigation",
        sanitizePlainText(`Backlog acknowledgement by ${actor}`, 340),
      );
      pushUploadSecurityAudit(actor, uploadId, "review_mark_pending", "Case marked pending structured investigation.");
      return { ok: true, uploadSecurity: snapshotUploadSecurity() };
    }

    if (action === "review_resolve") {
      assertSocCapability(body, "canUploadReviewResolve");
      job.investigationStatus = "resolved";
      job.resolvedByEmail = sanitizePlainText(actor, 254);
      job.updatedAt = new Date().toISOString();
      appendUploadLifecycle(
        job,
        "investigation_resolved",
        "SOC/IR closure",
        sanitizePlainText(`Investigation disposition recorded by ${actor}`, 340),
      );
      pushUploadSecurityAudit(actor, uploadId, "review_resolve", "Investigation formally resolved in SOC tooling.");
      return { ok: true, uploadSecurity: snapshotUploadSecurity() };
    }

    throw new ApiError("Unsupported upload ingest action envelope.", { status: 400 });
  }

  if (method === "GET" && normalized === "soar/snapshot") {
    await delay(50 + Math.random() * 140);
    return buildSoarSnapshotPayload();
  }

  if (method === "POST" && normalized === "soar/action") {
    await delay(80 + Math.random() * 220);
    maybeThrowSimulatedFailure("/soar/action");
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    const actor = gate.actor;
    const incidentId = sanitizePlainText(String(body.incidentId ?? ""), 120).trim();
    const action = String(body.action ?? "").toLowerCase();

    const snap = buildSoarSnapshotPayload();
    const target = snap.incidents.find((i) => i.id === incidentId);
    if (!target) {
      throw new ApiError("SOAR incident not found in correlated buffer.", { status: 404 });
    }
    const ip = sanitizePlainText(String(target.ip ?? ""), 45);
    const prev = soarLifecycleOverlay.get(incidentId) ?? {};

    const guardManual = /** @type {(intent: Parameters<typeof assertValidManualTransition>[1]) => void} */ (intent) => {
      const currentLifecycle = prev.lifecycle ?? target.lifecycle ?? SOAR_LIFECYCLE.DETECTED;
      try {
        assertValidManualTransition(currentLifecycle, intent);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid playbook transition.";
        throw new ApiError(msg, { status: 409 });
      }
    };

    if (action === "investigate") {
      assertSocCapability(body, "canInvestigateThreat");
      guardManual("investigate");
      soarLifecycleOverlay.set(incidentId, {
        ...prev,
        lifecycle: SOAR_LIFECYCLE.INVESTIGATING,
        dismissed: false,
        priority: prev.priority ?? "normal",
        updatedAt: new Date().toISOString(),
      });
      soarInvestigationIds.add(incidentId);
      pushSoarAudit(actor, incidentId, "investigate", `IR queue · ${target.headline}`, ip);
      return { ok: true, snapshot: buildSoarSnapshotPayload() };
    }

    if (action === "block") {
      assertSocCapability(body, "canMitigateThreat");
      guardManual("block");
      if (ip && isProbablyIpv4(ip)) {
        blockedIpSet.add(ip);
        notifyIamForSinkholeIp(ip, "Manual SOAR mitigate — correlated incident");
      }
      soarLifecycleOverlay.set(incidentId, {
        ...prev,
        lifecycle: SOAR_LIFECYCLE.MITIGATED,
        dismissed: false,
        priority: "normal",
        resolution: "sinkhole_applied",
        updatedAt: new Date().toISOString(),
      });
      soarInvestigationIds.delete(incidentId);
      pushSoarAudit(actor, incidentId, "block", `Mitigated · sinkhole ${ip}`, ip);
      return { ok: true, snapshot: buildSoarSnapshotPayload() };
    }

    if (action === "ignore") {
      assertSocCapability(body, "canDismissThreat");
      guardManual("ignore");
      revokeIncidentAutomationKeys(incidentId);
      soarLifecycleOverlay.set(incidentId, {
        ...prev,
        lifecycle: SOAR_LIFECYCLE.CLOSED,
        dismissed: true,
        priority: "low",
        resolution: "dismissed_noise",
        updatedAt: new Date().toISOString(),
      });
      soarInvestigationIds.delete(incidentId);
      pushSoarAudit(actor, incidentId, "ignore", "Dismissed as low relevance / benign noise.", ip);
      return { ok: true, snapshot: buildSoarSnapshotPayload() };
    }

    if (action === "assign") {
      assertSocCapability(body, "canAssignIncident");
      guardManual("assign");
      const assignee = sanitizePlainText(String(body.assigneeEmail ?? ""), 254).trim().toLowerCase();
      if (!assignee || !assignee.includes("@")) {
        throw new ApiError("Provide a valid assigneeEmail envelope.", { status: 400 });
      }
      soarLifecycleOverlay.set(incidentId, {
        ...prev,
        assignedTo: assignee,
        updatedAt: new Date().toISOString(),
      });
      pushSoarAudit(actor, incidentId, "assign", `Owner delegated → ${assignee}`, ip);
      return { ok: true, snapshot: buildSoarSnapshotPayload() };
    }

    throw new ApiError(
      "Unsupported SOAR action — allowed: investigate | block | ignore | assign.",
      { status: 400 },
    );
  }

  if (method === "GET" && normalized === "users") {
    return {
      generatedAt: new Date().toISOString(),
      items: iamUsers.map((u) => iamPublicRow(u)),
    };
  }

  const iamSegments = normalized.match(/^users\/([^/]+)$/);
  if (iamSegments) {
    const targetId = iamSegments[1];

    if (method === "GET") {
      await delay(60 + Math.random() * 160);
      maybeThrowSimulatedFailure("/users/profile");
      const row = findIamUserOrThrow(targetId);
      const base = iamPublicRow(row);
      base.activity = (row.activity ?? [])
        .slice()
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
        .slice(0, 36)
        .map((a) => ({
          id: a.id,
          title: sanitizePlainText(String(a.title), 280),
          iconKey: a.iconKey,
          time: iamRelativeTime(a.ts),
          ts: a.ts,
        }));
      base.sessionActive = !revokedPrincipalSet.has(String(row.email).toLowerCase());
      base.riskSeries = Array.isArray(row.riskSeries) ? row.riskSeries.map((n) => Number(n) || 0) : [];
      return {
        generatedAt: new Date().toISOString(),
        user: base,
      };
    }

    if (method === "PATCH") {
      const raw = options.body ?? {};
      const callerRole = String(raw.callerRole ?? "admin").toLowerCase();
      const u = findIamUserOrThrow(targetId);
      const prevRole = u.role;

      if (raw.fullName != null) {
        const nextName = sanitizePlainText(String(raw.fullName), 200).trim();
        if (!nextName) throw new ApiError("Full name cannot be empty.", { status: 400 });
        u.name = nextName;
      }
      if (raw.email != null) {
        const ne = sanitizePlainText(String(raw.email), 254).trim().toLowerCase();
        if (!ne.includes("@")) throw new ApiError("Invalid email.", { status: 400 });
        if (iamUsers.some((o) => o.id !== u.id && o.email.toLowerCase() === ne)) {
          throw new ApiError("Email already assigned to another principal.", { status: 409 });
        }
        u.email = ne;
      }
      if (raw.role != null) {
        const nr = String(raw.role);
        if (!APP_ROLES.includes(nr)) throw new ApiError("Invalid application role.", { status: 400 });
        iamAssertCallerRoleMutation(callerRole, prevRole, nr, "patch");
        if (u.role === "Admin" && nr !== "Admin" && countAdmins(iamUsers, u.id) === 0) {
          throw new ApiError("Cannot demote the last Organization Administrator.", { status: 400 });
        }
        if (nr !== prevRole) {
          u.role = nr;
          iamPushActivity(u, `Role changed to ${nr} (IAM policy enforcement)`, "cog");
        }
      }
      if (raw.status != null) {
        const st = String(raw.status) === "Suspended" ? "Suspended" : "Active";
        if (st !== u.status) {
          u.status = st;
          iamPushActivity(u, st === "Suspended" ? "Account suspended via admin console" : "Account activated", "alert");
        }
      }
      if (raw.allowedDevices != null) {
        let n = Number(raw.allowedDevices);
        if (!Number.isFinite(n)) n = 1;
        n = Math.min(99, Math.max(1, Math.round(n)));
        u.devices = String(n);
      }
      if (raw.notes != null) {
        u.notes = sanitizePlainText(String(raw.notes), 2000);
      }
      const pwd = raw.password !== undefined ? String(raw.password) : "";
      if (pwd.length > 0) {
        const pol = validatePasswordPolicy(pwd);
        if (!pol.ok) throw new ApiError("Password fails complexity policy.", { status: 400 });
        iamPushActivity(u, "Credential rotation accepted (provisioned externally)", "key");
      }
      return {
        ok: true,
        user: iamPublicRow(u),
      };
    }

    if (method === "DELETE") {
      const cr = String(
        options.body != null &&
          typeof options.body === "object" &&
          /** @type {{ callerRole?: string }} */ (options.body).callerRole != null
          ? /** @type {{ callerRole?: string }} */ (options.body).callerRole
          : "admin",
      ).toLowerCase();
      const u = findIamUserOrThrow(targetId);
      if (cr !== "admin") {
        throw new ApiError("Only administrators may delete identities.", { status: 403 });
      }
      if (u.role === "Admin" && countAdmins(iamUsers, u.id) === 0) {
        throw new ApiError("Cannot delete the last Organization Administrator.", { status: 400 });
      }
      iamUsers = iamUsers.filter((row) => row.id !== u.id);
      return { ok: true, id: u.id };
    }
  }

  if (method === "POST" && normalized === "users") {
    const raw = options.body ?? {};
    const callerRole = String(raw.callerRole ?? "admin").toLowerCase();
    const fullName = sanitizePlainText(String(raw.fullName ?? ""), 200).trim();
    const emailRaw = sanitizePlainText(String(raw.email ?? ""), 254).trim().toLowerCase();
    const role = String(raw.role ?? "");
    const status = String(raw.status ?? "Active") === "Suspended" ? "Suspended" : "Active";
    let devN = Number(raw.allowedDevices ?? 1);
    if (!Number.isFinite(devN)) devN = 1;
    devN = Math.min(99, Math.max(1, Math.round(devN)));
    const notes = sanitizePlainText(String(raw.notes ?? ""), 2000);

    if (!fullName) throw new ApiError("Full name is required.", { status: 400 });
    if (!emailRaw || !emailRaw.includes("@")) throw new ApiError("Valid email is required.", { status: 400 });
    if (!APP_ROLES.includes(role)) throw new ApiError("Invalid application role.", { status: 400 });
    const pwd = validatePasswordPolicy(String(raw.password ?? ""));
    if (!pwd.ok) throw new ApiError("Password fails complexity policy.", { status: 400 });
    iamAssertCallerRoleMutation(callerRole, "User", role, "create");

    if (iamUsers.some((x) => x.email.toLowerCase() === emailRaw)) {
      throw new ApiError("Principal with this email already exists.", { status: 409 });
    }

    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = {
      id,
      name: fullName,
      email: emailRaw,
      role,
      status,
      lastLogin: "Never",
      devices: String(devN),
      joined: new Date().toISOString().slice(0, 10),
      ips: [],
      uploads: 0,
      failedLogins: 0,
      locations: ["Pending geo-enrichment"],
      notes,
      riskSeries: [52, 54, 58, 60, 62, 65, 68],
      activity: [],
    };
    iamPushActivity(row, "Identity provisioned through admin console", "shield");
    iamUsers = [row, ...iamUsers];
    return { ok: true, user: iamPublicRow(row) };
  }

  if (method === "POST" && normalized === "security/block-ip") {
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    assertSocCapability(body, "canSinkholeManual");
    if (!rbacMatrixAllows("blockIp", readSocEnvelope(body).socRole)) {
      throw new ApiError("RBAC · Sinkhole privileges denied for persona / governance matrix.", { status: 403 });
    }
    const ip = sanitizePlainText(String(body.ip ?? ""), 64).trim();
    if (!isProbablyIpv4(ip)) {
      throw new ApiError("Invalid IPv4 for sinkhole policy.", { status: 400 });
    }
    blockedIpSet.add(ip);
    notifyIamForSinkholeIp(ip, "Manual analyst sinkhole — IAM asset touched blocked address");
    return { ok: true, blockedIps: [...blockedIpSet] };
  }

  if (method === "POST" && normalized === "sessions/revoke") {
    const principal = sanitizePlainText(String(options.body?.principal ?? ""), 160).trim().toLowerCase();
    if (!principal) {
      throw new ApiError("Missing principal identifier.", { status: 400 });
    }
    revokedPrincipalSet.add(principal);
    return { ok: true, revoked: principal };
  }

  if (method === "POST" && normalized === "security/scan") {
    await delay(280 + Math.random() * 400);
    maybeThrowSimulatedFailure("/security/scan:correlation");
    return {
      ok: true,
      scanId: `scan_${Date.now()}`,
      threatDetected: Math.random() > 0.38,
      mediumAlerts: Math.random() > 0.5 ? 4 : 2,
      blockedToday: Math.random() > 0.5 ? 22 : 14,
    };
  }

  if (method === "POST" && normalized === "exports/logs") {
    const body = /** @type {Record<string, unknown>} */ (options.body ?? {});
    const gate = readSocEnvelope(body);
    if (!rbacMatrixAllows("exportLogs", gate.socRole)) {
      throw new ApiError("RBAC · log export interchange denied.", { status: 403 });
    }
    const format = String(body.format ?? "csv").toLowerCase();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    return {
      ok: true,
      format,
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
    };
  }

  throw new ApiError(`Unknown simulated route ${method} /${normalized}`, { status: 404 });
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
  dashboardStats: () => apiClient("GET", "/dashboard/stats"),
  logs: () => apiClient("GET", "/logs"),
  auditLogsStream: () => apiClient("GET", "/logs/stream"),
  auditLogsFilter: (criteria) => apiClient("POST", "/logs/filter", { body: { criteria } }),
  analystActions: () => apiClient("GET", "/logs/analyst-actions"),
  logAnalystAction: (body) => apiClient("POST", "/logs/action", { body }),
  threats: () => apiClient("GET", "/threats"),
  soarSnapshot: () => apiClient("GET", "/soar/snapshot"),
  soarAction: (body) => apiClient("POST", "/soar/action", { body }),
  /** @deprecated use usersList — alias for GET /users */
  users: () => apiClient("GET", "/users"),
  usersList: () => apiClient("GET", "/users"),
  userProfile: (id) => apiClient("GET", `/users/${encodeURIComponent(id)}`),
  createUser: (body) => apiClient("POST", "/users", { body }),
  updateUser: (id, body) => apiClient("PATCH", `/users/${encodeURIComponent(id)}`, { body }),
  deleteUser: (id, body) =>
    apiClient("DELETE", `/users/${encodeURIComponent(id)}`, { body: body ?? { callerRole: "admin" } }),
  blockIp: (body) => apiClient("POST", "/security/block-ip", { body: typeof body === "string" ? { ip: body } : body }),
  revokeSession: (principal) => apiClient("POST", "/sessions/revoke", { body: { principal } }),
  startScan: () => apiClient("POST", "/security/scan"),
  exportLogsAck: (body) => apiClient("POST", "/exports/logs", { body }),
};
