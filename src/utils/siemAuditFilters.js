import { sanitizePlainText } from "@/utils/sanitize";
import { auditLogHaystack } from "@/utils/auditLogSchema";

/** @param {string} [ui] */
export function normalizeDateRangeToken(ui) {
  const u = String(ui ?? "today");
  if (u === "today" || u === "7d" || u === "30d" || u === "all") return u;
  if (u === "Today") return "today";
  if (u === "Last 7 Days") return "7d";
  if (u === "Last 30 Days") return "30d";
  return "today";
}

/**
 * Filter audit logs (deterministic SIEM facets).
 * @param {import('@/utils/auditLogSchema').AuditLog[]} logs
 * @param {{
 *   q?: string,
 *   severity?: string,
 *   action?: string,
 *   result?: string,
 *   dateRange?: 'today'|'7d'|'30d'|'all'|string,
 * }} criteria
 */
export function filterAuditLogs(logs, criteria) {
  const q = sanitizePlainText(String(criteria.q ?? ""), 220).trim().toLowerCase();
  const severity = criteria.severity === "All" || criteria.severity == null ? "" : String(criteria.severity);
  const action = criteria.action === "All" || criteria.action == null ? "" : String(criteria.action);
  const result = criteria.result === "All" || criteria.result == null ? "" : String(criteria.result);
  const range = normalizeDateRangeToken(criteria.dateRange);

  let fromTs = null;
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    fromTs = d.getTime();
  } else if (range === "7d") {
    fromTs = now - 7 * 86400000;
  } else if (range === "30d") {
    fromTs = now - 30 * 86400000;
  } else fromTs = null;

  /** @type {{ raw: import('@/utils/auditLogSchema').AuditLog, hay: string, ts: number }[]} */
  const indexed = logs.map((raw) => ({
    raw,
    hay: auditLogHaystack(raw),
    ts: Date.parse(raw.timestamp) || now,
  }));

  return indexed
    .filter(({ raw, hay, ts }) => {
      if (q && !hay.includes(q)) return false;

      if (severity && raw.severity !== severity) return false;
      if (action && raw.action !== action) return false;
      if (result && raw.result !== result) return false;

      if (fromTs != null && ts < fromTs) return false;
      return true;
    })
    .map(({ raw }) => raw);
}
