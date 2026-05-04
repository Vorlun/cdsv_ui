import { sanitizePlainText } from "@/utils/sanitize";

/** @param {unknown} result */
function isNegativeOutcome(result) {
  const s = String(result ?? "").toLowerCase();
  return s.includes("fail") || s.includes("denied") || s.includes("block");
}

const SEVERITY_RANK = /** @type {const} */ ({
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
});

/**
 * Telecom-style priority: Critical telemetry rises to top of analyst queue without losing recency ties.
 * @template T
 * @param {T[]} rows
 */
export function sortAuditPriority(rows) {
  return [...rows].sort((a, b) => {
    const rb = /** @type {{severity?: string}} */ (b);
    const ra = /** @type {{severity?: string}} */ (a);
    const sr = (SEVERITY_RANK[/** @type {keyof typeof SEVERITY_RANK} */ (rb.severity)] ?? 0) -
      (SEVERITY_RANK[/** @type {keyof typeof SEVERITY_RANK} */ (ra.severity)] ?? 0);
    if (sr !== 0) return sr;
    const tb = Date.parse(/** @type {{timestamp?: string}} */ (b).timestamp ?? "") || 0;
    const ta = Date.parse(/** @type {{timestamp?: string}} */ (a).timestamp ?? "") || 0;
    return tb - ta;
  });
}

/**
 * Correlate inbound fabric: repeated negative outcomes per source IP mimic brute-force / credential-stuffing heuristics.
 * @param {import('@/utils/auditLogSchema').AuditLog[]} logs full buffer or filtered slice
 */
export function buildCorrelationIndex(logs) {
  const ipNegCount = new Map();
  const ipTotal = new Map();

  for (const log of logs) {
    const ip = sanitizePlainText(String(log.ip ?? ""), 45);
    ipTotal.set(ip, (ipTotal.get(ip) ?? 0) + 1);
    if (isNegativeOutcome(log.result)) {
      ipNegCount.set(ip, (ipNegCount.get(ip) ?? 0) + 1);
    }
  }

  /** @type {Record<string, { relatedInBuffer: number, negativeAttempts: number, patternTier: string | null, suspicion: boolean }>} */
  const byId = {};
  const flaggedIps = new Set();

  for (const [ip, neg] of ipNegCount) {
    if (!ip) continue;
    if (neg >= 3) flaggedIps.add(ip);
  }

  for (const log of logs) {
    const ip = sanitizePlainText(String(log.ip ?? ""), 45);
    const negativeAttempts = ipNegCount.get(ip) ?? 0;
    const relatedInBuffer = ipTotal.get(ip) ?? 0;

    let patternTier = null;
    let suspicion = false;
    if (negativeAttempts >= 8) {
      patternTier = "high_volume_negative";
      suspicion = true;
    } else if (negativeAttempts >= 5) {
      patternTier = "escalating_failures";
      suspicion = true;
    } else if (negativeAttempts >= 3) {
      patternTier = "repeated_ip_attempts";
      suspicion = true;
    }

    byId[log.id] = { relatedInBuffer, negativeAttempts, patternTier, suspicion };
  }

  return {
    byId,
    flaggedIpCount: flaggedIps.size,
    flaggedIps: [...flaggedIps],
    suspiciousPatternDetected: flaggedIps.size > 0,
  };
}
