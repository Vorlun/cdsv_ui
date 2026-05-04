/**
 * Pure telemetry transforms for SOC console simulation — unit-test friendly.
 */

import { normalizeAuditLog, inferSeverityFromSignals } from "@/utils/auditLogSchema";

const THREAT_MESSAGES = Object.freeze([
  "Credential stuffing spike from edge POP",
  "Anomalous API gateway signature match",
  "SIM-swap anomaly correlated with OSS alarm",
  "DDoS precursor pattern on signalling interface",
]);

function pick(arr, i) {
  return arr[Math.abs(i) % arr.length];
}

/** @typedef {{ id: string, message: string, severity: string, ago: string, dismissed?: boolean }} ThreatAlert */

function severityRank(sev) {
  const s = String(sev ?? "");
  if (s === "Critical") return 4;
  if (s === "High") return 3;
  if (s === "Medium") return 2;
  return 1;
}

/**
 * @param {ThreatAlert[]} prev
 * @param {{ iteration: number, threatSensitivity?: number }} ctx
 */
export function patchThreatAlerts(prev, ctx) {
  const sensitivity = typeof ctx.threatSensitivity === "number" ? ctx.threatSensitivity : 76;
  const updated = prev.map((item, idx) => ({
    ...item,
    ago: `${1 + idx + (ctx.iteration % 4)}m ago`,
  }));
  /** Higher sensitivity ⇒ more stochastic alerts AND harsher severities for governance-trigger tests. */
  const spawnProb = Math.min(0.9, 0.3 + sensitivity / 400);
  if (Math.random() > spawnProb) {
    return { list: updated, spawned: null };
  }
  const roll = Math.random();
  let severity = "Medium";
  if (sensitivity >= 85) {
    if (roll > 0.18) severity = "Critical";
    else if (roll > 0.45) severity = "High";
  } else if (sensitivity >= 65) {
    if (roll > 0.32) severity = "Critical";
    else if (roll > 0.5) severity = "High";
  } else if (roll > 0.58) severity = "High";

  const newAlert = {
    id: `A-${crypto.randomUUID?.() ?? Date.now()}`,
    message: pick(THREAT_MESSAGES, ctx.iteration),
    severity,
    ago: "just now",
    dismissed: false,
  };
  return { list: [newAlert, ...updated].slice(0, 6), spawned: newAlert };
}

const LOG_BLUEPRINT = Object.freeze([
  {
    user: "Unknown",
    email: "-",
    action: "Login",
    result: "Blocked",
    ip: "203.11.2.90",
    location: "Singapore",
    device: "Chrome / Linux VM",
    risk: 91,
  },
  {
    user: "User Analyst",
    email: "user@test.com",
    action: "Upload",
    result: "Success",
    ip: "10.1.1.34",
    location: "Tashkent, UZ",
    device: "iPhone 15",
    risk: 34,
  },
  {
    user: "SOC Viewer",
    email: "soc.viewer@test.com",
    action: "Export",
    result: "Success",
    ip: "192.168.4.20",
    location: "Amsterdam, NL",
    device: "Windows 11 Secure Desktop",
    risk: 28,
  },
  {
    user: "Unknown",
    email: "-",
    action: "API Probe",
    result: "Blocked",
    ip: "91.80.27.41",
    location: "Warsaw, PL",
    device: "Headless chromium",
    risk: 96,
  },
]);

/**
 * Ingest telemetry row for SIEM / dashboard feed (immutable-first).
 */
export function patchLiveLogs(prev, iteration, telemetryBoost = 0) {
  void iteration;
  if (Math.random() < 0.55) return prev;
  const picked = LOG_BLUEPRINT[Math.floor(Math.random() * LOG_BLUEPRINT.length)];
  const iso = new Date().toISOString();
  let risk = picked.risk;
  if (Number.isFinite(telemetryBoost) && telemetryBoost > 0) {
    risk = Math.min(100, Math.round(risk + telemetryBoost * (0.4 + Math.random() * 0.9)));
  }
  const raw = {
    id: `live-${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
    timestamp: iso,
    user: picked.user,
    email: picked.email,
    ip: picked.ip,
    location: picked.location,
    device: picked.device,
    action: picked.action,
    result: picked.result,
    severity: inferSeverityFromSignals(picked.action, picked.result),
    meta: {
      risk,
      sessionId: `sess_${Math.floor(2100 + Math.random() * 8800)}`,
    },
  };
  const row = normalizeAuditLog(raw);
  return [row, ...prev].slice(0, 100);
}

export function jitterSessions(prev, iteration) {
  const delta = (iteration % 5) + Math.floor(Math.random() * 7) - 3;
  return Math.max(100, prev + delta);
}
