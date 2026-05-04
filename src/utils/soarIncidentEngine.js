import { sanitizePlainText } from "@/utils/sanitize";
import { computeGeographicThreatFactor } from "@/utils/geoRiskFactors";

/** SOAR playbook lifecycle (enterprise IR). */
export const SOAR_LIFECYCLE = Object.freeze({
  DETECTED: "detected",
  INVESTIGATING: "investigating",
  MITIGATED: "mitigated",
  CLOSED: "closed",
});

const SEVERITY_SCORE = Object.freeze({
  Critical: 88,
  High: 68,
  Medium: 48,
  Low: 28,
});

/** Rough lat/lng for telecom POP / capital anchoring → attack map arcs. */
const LOCATION_COORDS = [
  ["berlin", 52.52, 13.405],
  ["frankfurt", 50.11, 8.68],
  ["tashkent", 41.3, 69.24],
  ["singapore", 1.35, 103.8192],
  ["amsterdam", 52.37, 4.895],
  ["warsaw", 52.23, 21.012],
  ["new york", 40.7128, -74.006],
  ["delhi", 28.61, 77.209],
  ["istanbul", 41.01, 28.98],
  ["são paulo", -23.55, -46.63],
];

function hashToPosition(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const x = 12 + Math.abs(h % 76);
  const y = 14 + Math.abs((h >> 8) % 42);
  return { x, y };
}

export function geoToSvgPoint(lat, lon, vw = 100, vh = 70) {
  const x = ((lon + 180) / 360) * vw;
  const y = ((90 - lat) / 180) * vh;
  return {
    x: Math.min(vw - 2, Math.max(2, x)),
    y: Math.min(vh - 3, Math.max(2, y)),
  };
}

/** @param {string} raw */
export function coordsFromLocationString(raw) {
  const lowered = sanitizePlainText(String(raw ?? ""), 120).toLowerCase();
  for (const [needle, lat, lon] of LOCATION_COORDS) {
    if (lowered.includes(needle)) return geoToSvgPoint(lat, lon);
  }
  return hashToPosition(lowered || "UNK");
}

function isNegativeResult(result) {
  const s = String(result ?? "").toLowerCase();
  return s.includes("fail") || s.includes("denied") || s.includes("block");
}

function dominantSeverity(rows) {
  const ranks = ["Low", "Medium", "High", "Critical"];
  let best = 0;
  for (const r of rows) {
    const i = ranks.indexOf(r.severity);
    if (i > best) best = i;
  }
  return ranks[best];
}

/**
 * @param {{
 *   severityLabel?: string,
 *   frequency?: number,
 *   openIncidentPressure?: number,
 *   geographyFactor?: number,
 *   campaignIncidentsApprox?: number,
 * }} opts
 */
export function computeSoarRiskScore(opts) {
  const {
    severityLabel,
    frequency = 1,
    openIncidentPressure = 0,
    geographyFactor = 0,
    campaignIncidentsApprox = 1,
  } = opts;
  const base = SEVERITY_SCORE[severityLabel] ?? 45;
  const freqBoost = Math.min(26, frequency * 2.8);
  const cohort = Math.min(18, Math.sqrt(Math.max(0, openIncidentPressure)) * 4);
  const geo = Math.min(22, Math.max(0, geographyFactor ?? 0));
  const swarm = Math.min(12, Math.sqrt(Math.max(1, campaignIncidentsApprox)) * 3.2);
  const raw = base * 0.48 + freqBoost + cohort + geo * 0.55 + swarm;
  return Math.min(99, Math.round(raw));
}

/**
 * Correlate telemetry into one actionable incident per attacking source IP.
 * Mirrors SIEM normalization → SOAR playbook creation.
 *
 * @param {import('@/utils/auditLogSchema').AuditLog[]} logs normalized buffer
 * @param {{ get: (k: string) => { lifecycle?: string, priority?: string, dismissed?: boolean } | undefined }} lifecycleStore
 */
export function correlateIncidentsFromLogs(logs, lifecycleStore) {
  const byIp = new Map();
  for (const log of logs) {
    const ip = sanitizePlainText(String(log.ip ?? ""), 45);
    if (!ip) continue;
    if (!byIp.has(ip)) byIp.set(ip, []);
    byIp.get(ip).push(log);
  }

  const ipAggressorCount = [...byIp.keys()].filter((ip) => {
    const rs = byIp.get(ip);
    const neg = rs.filter((r) => isNegativeResult(r.result)).length;
    const crit = rs.filter((r) => r.severity === "Critical").length;
    return neg >= 2 || crit >= 1 || (neg >= 1 && rs.length >= 6);
  }).length;

  /** @type {object[]} */
  const out = [];

  for (const [ip, rows] of byIp) {
    const negHits = rows.filter((r) => isNegativeResult(r.result)).length;
    const loginFails = rows.filter((r) => r.action === "Login" && isNegativeResult(r.result)).length;
    const apiBlocked = rows.filter((r) => r.action === "API Probe").length;
    const uploadFail = rows.filter((r) => r.action === "Upload" && isNegativeResult(r.result)).length;

    let qualifies =
      negHits >= 3 || loginFails >= 3 || rows.some((r) => r.severity === "Critical") || uploadFail >= 2;

    const exportAnomaly = rows.filter((r) => r.action === "Export" && isNegativeResult(r.result)).length;
    const deleteAnomaly = rows.filter((r) => r.action === "Delete" && isNegativeResult(r.result)).length;
    const robotSignals = rows.filter((r) => /bot|scanner|curl|phantomjs|headless|automation/i.test(String(r.device ?? ""))).length;

    if (exportAnomaly + deleteAnomaly >= 2) qualifies = true;
    if (apiBlocked >= 2 && negHits >= 2) qualifies = true;
    if (robotSignals >= 3 && negHits >= 1) qualifies = true;
    if (!qualifies) continue;

    /** @type {{type: string, forcedSeverity?: string}} */
    const pick = pickThreatPattern(rows, {
      negHits,
      loginFails,
      apiBlocked,
      uploadFail,
      exportAnomaly,
      deleteAnomaly,
      robotSignals,
    });

    const id = slugIncidentId(ip, pick.type);

    let sev = pick.forcedSeverity ?? dominantSeverity(rows);
    const timestamps = rows.map((r) => Date.parse(r.timestamp) || Date.now()).filter(Number.isFinite);
    const lastTs = Math.max(...timestamps);

    const frequency = Math.max(negHits, Math.ceil(rows.length * 0.35));
    const loc = sanitizePlainText(rows[0]?.location ?? "Unknown", 120);
    const geoFactor = computeGeographicThreatFactor(loc, ip);
    const campaignApprox = ipAggressorCount;
    const riskScore = computeSoarRiskScore({
      severityLabel: sev,
      frequency,
      openIncidentPressure: ipAggressorCount,
      geographyFactor: geoFactor,
      campaignIncidentsApprox: campaignApprox,
    });

    const overlay = lifecycleStore.get(id);

    out.push({
      id,
      type: pick.type,
      ip,
      severity: sev,
      attempts: rows.length,
      detectedAtIso: rows[0]?.timestamp ?? new Date().toISOString(),
      lastSeenIso: new Date(lastTs).toISOString(),
      lifecycle: overlay?.lifecycle ?? SOAR_LIFECYCLE.DETECTED,
      priority: overlay?.priority ?? "normal",
      dismissed: Boolean(overlay?.dismissed),
      resolution: overlay?.resolution ?? "",
      riskScore,
      sourceLogIds: rows.map((r) => r.id),
      headline: `${sanitizePlainText(pick.type, 80)} (${negHits}+ negative outcomes · ${sanitizePlainText(ip, 45)})`,
      geoLabel: loc,
      correlationKeys: [`ip:${ip}`, `pattern:${sanitizePlainText(pick.type, 48)}`],
    });
  }

  out.push(...correlatePrincipalCampaigns(logs, lifecycleStore, ipAggressorCount));

  out.sort((a, b) => Date.parse(b.lastSeenIso) - Date.parse(a.lastSeenIso));
  return out;
}

/** @typedef {{negHits: number, loginFails: number, apiBlocked: number, uploadFail: number, exportAnomaly: number, deleteAnomaly: number, robotSignals: number}} PatternCtx */

/** @param {import('@/utils/auditLogSchema').AuditLog[]} rows @param {PatternCtx} ctx */
function pickThreatPattern(rows, ctx) {
  const criticalInfra = rows.some((r) => r.severity === "Critical");

  if (ctx.uploadFail >= 2)
    return { type: "Malware Upload Campaign", forcedSeverity: "Critical" };
  if (ctx.loginFails >= 3 || ctx.negHits >= 5) return { type: "Brute Force Attack" };
  if (ctx.robotSignals >= 3 && ctx.negHits >= 1)
    return { type: "Bot / Scanner Campaign", forcedSeverity: ctx.negHits >= 4 ? "High" : "Medium" };
  if (
    ctx.apiBlocked >= 2 ||
    rows.filter((r) => r.action === "API Probe" && isNegativeResult(r.result)).length >= 2
  )
    return { type: "API Abuse Campaign" };
  if (ctx.exportAnomaly >= 2) return { type: "Data Exfiltration Attempt" };
  if (criticalInfra) return { type: "Critical Infrastructure Alert" };
  return { type: "Coordinated Abuse Pattern" };
}

/** Cross-IP abusive principal (telecom BSS identity sprawl heuristic). */
function correlatePrincipalCampaigns(logs, lifecycleStore, openPressure) {
  const byEm = new Map();
  for (const log of logs) {
    const em = sanitizePlainText(String(log.email ?? ""), 254).toLowerCase().trim();
    if (!em || em === "-" || em === "unknown" || em === "(none)") continue;
    if (!byEm.has(em)) byEm.set(em, []);
    byEm.get(em).push(log);
  }

  /** @type {object[]} */
  const extra = [];

  for (const [principal, rows] of byEm) {
    const originIps = new Set(rows.map((r) => sanitizePlainText(r.ip ?? "", 45)).filter(Boolean));
    if (originIps.size < 2) continue;
    const negHits = rows.filter((r) => isNegativeResult(r.result)).length;
    const loginFails = rows.filter((r) => r.action === "Login" && isNegativeResult(r.result)).length;
    const apiHits = rows.filter((r) => r.action === "API Probe").length;
    let qualifies =
      loginFails >= 3 || negHits >= 6 || apiHits >= 4 || rows.some((r) => r.severity === "Critical");
    if (!qualifies) continue;

    let type = "Identity Sprawl / Credential Abuse";
    if (apiHits >= 4) type = "API Token Abuse Across POPs";

    const id = slugPrincipalId(principal, type);
    const sev = dominantSeverity(rows);
    const timestamps = rows.map((r) => Date.parse(r.timestamp) || Date.now()).filter(Number.isFinite);
    const lastTs = Math.max(...timestamps);
    const primaryIp = sanitizePlainText(rows.sort((a, b) => (b.meta?.risk ?? 0) - (a.meta?.risk ?? 0))[0]?.ip ?? "", 45);
    const loc = sanitizePlainText(rows[0]?.location ?? "Unknown", 120);
    const frequency = Math.max(negHits, Math.ceil(rows.length * 0.22));
    const geoFactor = computeGeographicThreatFactor(loc, primaryIp ?? "");
    const overlay = lifecycleStore.get(id);

    extra.push({
      id,
      type,
      ip: primaryIp || "multi-origin",
      principal,
      severity: sev,
      attempts: rows.length,
      detectedAtIso: rows[0]?.timestamp ?? new Date().toISOString(),
      lastSeenIso: new Date(lastTs).toISOString(),
      lifecycle: overlay?.lifecycle ?? SOAR_LIFECYCLE.DETECTED,
      priority: overlay?.priority ?? "normal",
      dismissed: Boolean(overlay?.dismissed),
      resolution: overlay?.resolution ?? "",
      riskScore: computeSoarRiskScore({
        severityLabel: sev,
        frequency,
        openIncidentPressure: openPressure,
        geographyFactor: geoFactor + 4,
        campaignIncidentsApprox: originIps.size,
      }),
      sourceLogIds: rows.map((r) => r.id),
      headline: `${sanitizePlainText(type, 72)} (${originIps.size} POP hops · ${sanitizePlainText(principal, 254)})`,
      geoLabel: loc,
      correlationKeys: [`principal:${sanitizePlainText(principal, 254)}`, `multi_ip:${originIps.size}`],
    });
  }

  return extra;
}

function slugPrincipalId(email, pattern) {
  const slug =
    sanitizePlainText(email, 254)
      .replace(/[^\dA-Za-z]+/g, "-")
      .slice(0, 48) + pattern.replace(/\s+/g, "").slice(0, 8);
  return `SOAR-USER-${slug}`;
}

function slugIncidentId(ip, type) {
  const ipPart = sanitizePlainText(ip, 45).replace(/[^\dA-Za-z]+/g, "-");
  const t = type.replace(/\s+/g, "").slice(0, 12);
  return `SOAR-${ipPart}-${t}`;
}

/** @param {object[]} incidents */
export function buildAttackMix(incidents) {
  const tally = new Map();
  const colors = ["#EF4444", "#F97316", "#3B82F6", "#F59E0B", "#8B5CF6", "#10B981"];
  for (const inc of incidents) {
    tally.set(inc.type, (tally.get(inc.type) ?? 0) + 1);
  }
  const total = [...tally.values()].reduce((s, v) => s + v, 0) || 1;
  let idx = 0;
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name: sanitizePlainText(name, 80),
      value: Math.round((count / total) * 100),
      raw: count,
      color: colors[idx++ % colors.length],
    }))
    .slice(0, 6);
}

function hourBucket(iso) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

/** @param {object[]} incidents */
export function buildThreatTimeline(incidents) {
  const map = new Map();
  for (const inc of incidents) {
    const k = hourBucket(inc.lastSeenIso);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length === 0) {
    return [
      { time: "08:00", threats: 2 },
      { time: "10:00", threats: 4 },
      { time: "12:00", threats: 3 },
    ];
  }
  return sorted.map(([time, threats]) => ({ time, threats }));
}

/** @param {import('@/utils/auditLogSchema').AuditLog[]} logs */
export function buildTopCountriesFromLogs(logs) {
  const counts = new Map();
  for (const log of logs) {
    const loc = sanitizePlainText(String(log.location ?? ""), 120);
    if (!loc || loc === "Unknown") continue;
    const country = loc.includes(",") ? loc.split(",").pop().trim() : loc;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([country, count]) => ({ country, count }));
}

/**
 * @param {object[]} incidents correlated
 * @param {import('@/utils/auditLogSchema').AuditLog[]} logs
 */
export function buildMapPoints(incidents, logs) {
  const seen = new Set();
  /** @type {object[]} */
  const pts = [];
  for (const inc of incidents) {
    if (seen.has(inc.geoLabel)) continue;
    seen.add(inc.geoLabel);
    const { x, y } = coordsFromLocationString(inc.geoLabel);
    pts.push({
      id: `map-${inc.id}`,
      label: sanitizePlainText(inc.geoLabel, 120),
      x,
      y,
      pulse: Math.min(98, Math.round((inc.riskScore ?? 50) / 10)),
      severity: inc.severity,
    });
  }

  /** Backfill hotspots from noisy logs outside correlated set */
  for (const log of logs) {
    if (pts.length >= 14) break;
    if (!isNegativeResult(log.result) && log.severity !== "Critical") continue;
    const lab = sanitizePlainText(String(log.location ?? ""), 120);
    if (!lab || seen.has(lab)) continue;
    seen.add(lab);
    const { x, y } = coordsFromLocationString(lab);
    pts.push({
      id: `map-log-${sanitizePlainText(String(log.id), 64)}`,
      label: lab,
      x,
      y,
      pulse: log.severity === "Critical" ? 9 : 5,
      severity: log.severity,
    });
  }

  return pts.slice(0, 16);
}

export function summarizeGlobalRisk(incidents) {
  const open = incidents.filter(
    (i) =>
      !i.dismissed &&
      i.lifecycle !== SOAR_LIFECYCLE.CLOSED &&
      i.priority !== "low",
  );
  const top = [...open].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 5);
  if (!top.length) return Math.min(99, Math.round(open.length * 3 + 32));
  const avg = top.reduce((s, t) => s + (t.riskScore ?? 0), 0) / top.length;
  const pressure = Math.min(22, open.length * 2.4);
  return Math.min(99, Math.round(avg * 0.72 + pressure));
}
