import { sanitizePlainText } from "@/utils/sanitize";

/** @typedef {{ id: string, timestamp: string, user: string, email: string, ip: string, location: string, device: string, action: string, severity: string, result: string, meta?: { risk?: number, sessionId?: string } }} AuditLog */

export const AUDIT_RESULTS = Object.freeze(["Success", "Failed", "Blocked", "Denied"]);
export const AUDIT_SEVERITIES = Object.freeze(["Low", "Medium", "High", "Critical"]);

/**
 * Normalize API / legacy row → canonical telecom SIEM audit record.
 * @param {Record<string, unknown>} raw
 * @returns {AuditLog}
 */
export function normalizeAuditLog(raw) {
  const id = sanitizePlainText(String(raw.id ?? ""), 64) || `L-${Date.now()}`;
  const ts =
    typeof raw.timestamp === "string" && raw.timestamp.includes("T")
      ? raw.timestamp
      : legacyTimestampFromTime(raw.time);
  const user = sanitizePlainText(String(raw.user ?? ""), 160);
  const email = sanitizePlainText(String(raw.email ?? ""), 254).toLowerCase();
  const ip = sanitizePlainText(String(raw.ip ?? ""), 45);
  const location = sanitizePlainText(String(raw.location ?? "Unknown POP"), 120);
  const device = sanitizePlainText(String(raw.device ?? "Unknown UA"), 120);
  const action = sanitizePlainText(String(raw.action ?? "Event"), 80);
  const result = sanitizePlainText(String(raw.result ?? "Unknown"), 32);
  const severity = normalizeSeverity(raw.severity, action, result);
  const existingRisk = Number(raw?.meta?.risk ?? raw.risk);
  const meta = {
    risk: Number.isFinite(existingRisk) ? existingRisk : heuristicRisk(severity, result),
    sessionId: sanitizePlainText(String(raw?.meta?.sessionId ?? raw.session ?? ""), 96),
  };
  if (!meta.sessionId) meta.sessionId = `sess_${Math.floor(10000 + Math.random() * 89999)}`;

  /** @type {AuditLog & { time: string }} */
  const row = {
    id,
    timestamp: ts,
    time: formatShortTime(ts),
    user,
    email,
    ip,
    location,
    device,
    action,
    severity,
    result,
    meta,
  };
  return row;
}

/** @param {AuditLog} log */
export function auditLogHaystack(log) {
  return [
    log.user,
    log.email,
    log.ip,
    log.location,
    log.device,
    log.action,
    log.severity,
    log.result,
    log.timestamp,
    log.meta?.sessionId ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function formatShortTime(isoLike) {
  try {
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return sanitizePlainText(String(isoLike), 16).slice(-5);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

export function formatDisplayTimestamp(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return sanitizePlainText(String(iso), 40);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
      hour12: false,
    });
  } catch {
    return sanitizePlainText(String(iso), 48);
  }
}

function legacyTimestampFromTime(time) {
  const t = sanitizePlainText(String(time ?? ""), 10);
  const today = new Date();
  const [hh, mm] = t.includes(":") ? t.split(":") : ["0", "0"];
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return today.toISOString();
  const copy = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
  return copy.toISOString();
}

export function normalizeSeverity(rawSev, action, result) {
  const s = sanitizePlainText(String(rawSev ?? ""), 24);
  if (AUDIT_SEVERITIES.includes(s)) return s;
  return inferSeverityFromSignals(action, result);
}

export function inferSeverityFromSignals(action, result) {
  const a = String(action).toLowerCase();
  const r = String(result).toLowerCase();
  if (r === "blocked" || r === "denied") {
    if (a.includes("api") || a.includes("probe")) return "Critical";
    return "High";
  }
  if (r === "failed") return "Medium";
  return "Low";
}

function heuristicRisk(severity, result) {
  let base =
    severity === "Critical"
      ? 94
      : severity === "High"
        ? 78
        : severity === "Medium"
          ? 52
          : 28;
  if (/blocked|denied/i.test(result)) base = Math.min(100, base + 12);
  return Math.min(100, Math.round(base + Math.random() * 6));
}

/**
 * Rows for CSV (already sanitized primitives).
 * @param {AuditLog[]} rows
 */
export function auditLogsToCsv(rows) {
  const header =
    "id,timestamp,user,email,ip,location,device,action,severity,result,session,risk_score";
  const lines = rows.map((r) =>
    [
      r.id,
      r.timestamp,
      r.user,
      r.email,
      r.ip,
      r.location,
      r.device,
      r.action,
      r.severity,
      r.result,
      r.meta?.sessionId ?? "",
      String(r.meta?.risk ?? ""),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
