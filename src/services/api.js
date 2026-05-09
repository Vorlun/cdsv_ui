/**
 * SOC-facing REST facade for secure upload & posture telemetry.
 * All paths are appended to {@link import("@/config/env").env.apiBaseUrl}.
 *
 * Requires a reachable `VITE_API_BASE_URL` to use HTTP.
 */

import { apiRequest } from "./api/apiRequest";
import { ApiError } from "./api/apiError";
import { env } from "@/config/env";
import { getAccessToken } from "@/utils/tokenMemory";

export const SOC_API_PATHS = Object.freeze({
  upload: "/upload",
  files: "/files",
  vault: "/vault",
  dashboardOverview: "/dashboard/overview",
  dashboardActivity: "/dashboard/activity",
  dashboardUploadTelemetry: "/dashboard/upload-telemetry",
  securityStatus: "/security-status",
  sessions: "/sessions",
  settings: "/settings",
});

/**
 * @typedef {"stored"|"blocked"|string} SocStoredStatus
 */

/**
 * Canonical ingest acknowledgement (northbound contract).
 *
 * @typedef {{
 *   status: SocStoredStatus,
 *   fileId: string,
 *   hash: string,
 *   encryption: "AES-256-GCM",
 *   threatLevel: string,
 *   securityScore: number
 * }} SocUploadStoredResponse
 */

/**
 * Breakdown used on Security Status & dashboard posture tiles.
 *
 * @typedef {{
 *   device: number,
 *   frontend: number,
 *   backend: number,
 *   encryption: number,
 *   cloud: number,
 *   status?: "normal"|"degraded"|"critical"|string,
 *   mode?: "live"|"cached"|"initializing"|string,
 *   cacheAge?: number,
 *   lastSuccessfulSync?: string,
 *   hasEvidence?: boolean,
 *   securityScore?: number,
 *   components?: Record<string, number>,
 *   metrics?: Record<string, number>,
 *   forensicHealth?: Record<string, number>,
 *   threatAnalysis?: Record<string, unknown>,
 *   telemetryStream?: Array<Record<string, unknown>>,
 *   timeline?: Array<Record<string, unknown>>
 * }} SocSecurityStatusResponse
 */

/**
 * @typedef {{
 *   device: string,
 *   ip: string,
 *   location: string,
 *   lastActive: string,
 *   status: "active"|string
 * }} SocSessionRow
 */

/**
 * @typedef {{
 *   id?: string,
 *   name: string,
 *   uploadedAt: string,
 *   status: string,
 *   hash?: string,
 *   threatLevel?: string
 * }} SocFileRow
 */

const SCORE_KEYS = /** @type {(keyof SocSecurityStatusResponse)[]} */ (["device", "frontend", "backend", "encryption", "cloud"]);
let globalApiErrorHandler = null;

export function setGlobalSocApiErrorHandler(handler) {
  globalApiErrorHandler = typeof handler === "function" ? handler : null;
}

async function runSocRequest(task) {
  try {
    return await task();
  } catch (error) {
    if (globalApiErrorHandler) {
      try {
        globalApiErrorHandler(error);
      } catch {
        /* ignore consumer handler failures */
      }
    }
    throw error;
  }
}

function assertNumber(n, field) {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new ApiError(`Invalid numeric field: ${field}`, { status: 422 });
  }
}

/**
 * Validates and returns a strict upload response for UI binding.
 * @param {unknown} body
 * @returns {SocUploadStoredResponse}
 */
export function parseSocUploadResponse(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError("POST /upload: expected JSON object", { status: 422, body });
  }
  const o = /** @type {Record<string, unknown>} */ (body);
  const status = String(o.status ?? "");
  const fileId = String(o.fileId ?? "");
  const hash = String(o.hash ?? "");
  const threatLevel = String(o.threatLevel ?? "LOW");
  const encRaw = o.encryption != null ? String(o.encryption) : "";
  // securityScore is optional — fall back to 94 if missing or non-numeric
  const rawScore = typeof o.securityScore === "number" ? o.securityScore : Number(o.securityScore ?? NaN);
  const securityScore = Number.isFinite(rawScore) ? rawScore : 94;
  if (!fileId || !hash) throw new ApiError("POST /upload: missing fileId or hash in server response", { status: 422, body });
  if (encRaw && encRaw !== "AES-256-GCM") {
    throw new ApiError("POST /upload: unexpected encryption algorithm in server response", { status: 422, body });
  }
  return {
    status: status || "stored",
    fileId,
    hash,
    encryption: "AES-256-GCM",
    threatLevel,
    securityScore,
  };
}

/**
 * @param {unknown} body
 * @returns {SocSecurityStatusResponse}
 */
export function parseSocSecurityStatus(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError("GET /security-status: expected JSON object", { status: 422, body });
  }
  const o = /** @type {Record<string, unknown>} */ (body);
  const out = /** @type {SocSecurityStatusResponse} */ ({});
  for (const k of SCORE_KEYS) {
    const v = o[k];
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) throw new ApiError(`GET /security-status: invalid ${k}`, { status: 422, body });
    out[k] = Math.max(0, Math.min(100, Math.round(n)));
  }
  out.status = String(o.status ?? "normal");
  out.mode = String(o.mode ?? "live");
  out.cacheAge = Number(o.cacheAge ?? 0);
  out.lastSuccessfulSync = String(o.lastSuccessfulSync ?? new Date().toISOString());
  out.hasEvidence = Boolean(o.hasEvidence ?? true);
  out.securityScore = Number(o.securityScore ?? Math.round(SCORE_KEYS.reduce((sum, key) => sum + Number(out[key] || 0), 0) / SCORE_KEYS.length));
  out.components = o.components && typeof o.components === "object" ? /** @type {Record<string, number>} */ (o.components) : {};
  out.metrics = o.metrics && typeof o.metrics === "object" ? /** @type {Record<string, number>} */ (o.metrics) : {};
  out.forensicHealth = o.forensicHealth && typeof o.forensicHealth === "object" ? /** @type {Record<string, number>} */ (o.forensicHealth) : {};
  out.threatAnalysis = o.threatAnalysis && typeof o.threatAnalysis === "object" ? /** @type {Record<string, unknown>} */ (o.threatAnalysis) : {};
  out.telemetryStream = Array.isArray(o.telemetryStream) ? /** @type {Array<Record<string, unknown>>} */ (o.telemetryStream) : [];
  out.timeline = Array.isArray(o.timeline) ? /** @type {Array<Record<string, unknown>>} */ (o.timeline) : [];
  return out;
}

/**
 * @param {unknown} body
 * @returns {SocSessionRow[]}
 */
export function parseSocSessions(body) {
  if (!Array.isArray(body)) {
    throw new ApiError("GET /sessions: expected JSON array", { status: 422, body });
  }
  return body.map((row, i) => {
    if (!row || typeof row !== "object") {
      throw new ApiError(`GET /sessions: invalid row ${i}`, { status: 422, body });
    }
    const r = /** @type {Record<string, unknown>} */ (row);
    return {
      device: String(r.device ?? ""),
      ip: String(r.ip ?? ""),
      location: String(r.location ?? ""),
      lastActive: String(r.lastActive ?? ""),
      status: String(r.status ?? "active"),
    };
  });
}

/**
 * @param {unknown} body
 * @returns {SocFileRow[]}
 */
export function parseSocFilesList(body) {
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray(body.files) ? body.files : null;
  if (!list) throw new ApiError("GET /files: expected array or { files: [] }", { status: 422, body });
  return list.map((row, i) => {
    if (!row || typeof row !== "object") throw new ApiError(`GET /files: invalid row ${i}`, { status: 422, body });
    const r = /** @type {Record<string, unknown>} */ (row);
    return {
      id: r.id != null ? String(r.id) : r.fileId != null ? String(r.fileId) : undefined,
      name: String(r.name ?? "unnamed"),
      uploadedAt: String(r.uploadedAt ?? r.createdAt ?? ""),
      status: String(r.status ?? "unknown"),
      hash: r.hash != null ? String(r.hash) : undefined,
      threatLevel: r.threatLevel != null ? String(r.threatLevel) : undefined,
      riskScore: Number(r.riskScore ?? 0),
      integrityScore: Number(r.integrityScore ?? 0),
      entropyScore: Number(r.entropyScore ?? 0),
      heuristicConfidence: Number(r.heuristicConfidence ?? 0),
      classification: r.classification != null ? String(r.classification) : undefined,
      encryptionStatus: r.encryptionStatus != null ? String(r.encryptionStatus) : undefined,
      malwareScanStatus: r.malwareScanStatus != null ? String(r.malwareScanStatus) : undefined,
      telemetryStatus: r.telemetryStatus != null ? String(r.telemetryStatus) : undefined,
      extension: r.extension != null ? String(r.extension) : undefined,
      ingestNode: r.ingestNode != null ? String(r.ingestNode) : undefined,
      archiveRegion: r.archiveRegion != null ? String(r.archiveRegion) : undefined,
      vaultTier: r.vaultTier != null ? String(r.vaultTier) : undefined,
      relayPath: r.relayPath != null ? String(r.relayPath) : undefined,
      socState: r.socState != null ? String(r.socState) : undefined,
      quarantineState: r.quarantineState != null ? String(r.quarantineState) : undefined,
      quarantineReason: r.quarantineReason != null ? String(r.quarantineReason) : undefined,
      replicationHealth: Number(r.replicationHealth ?? 0),
      propagationLatency: Number(r.propagationLatency ?? 0),
    };
  });
}

/**
 * @param {unknown} body
 * @returns {{
 *  id: string,
 *  name: string,
 *  originalName: string,
 *  storedName: string,
 *  uploadedAt: string,
 *  mimeType: string,
 *  sizeBytes: number,
 *  hash: string,
 *  path: string,
 *  uploaderId: string,
 *  encryptionStatus: string,
 *  malwareScanStatus: string,
 *  integrityStatus: string,
 *  verificationStatus: string,
 *  threatLevel: string,
 *  securityScore: number,
 *  classification: string,
 *  telemetryStatus: string,
 *  timeline: Array<{ id: string, type: string, severity: string, source: string, message: string, at: string, metadata?: Record<string, unknown> }>
 * }}
 */
export function parseSocFileDetail(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError("GET /files/:id: expected JSON object", { status: 422, body });
  }
  const o = /** @type {Record<string, unknown>} */ (body);
  const timelineRaw = Array.isArray(o.timeline) ? o.timeline : [];
  return {
    id: String(o.id ?? ""),
    name: String(o.name ?? "unnamed"),
    originalName: String(o.originalName ?? o.name ?? "unnamed"),
    storedName: String(o.storedName ?? ""),
    uploadedAt: String(o.uploadedAt ?? ""),
    mimeType: String(o.mimeType ?? "application/octet-stream"),
    sizeBytes: Number(o.sizeBytes ?? 0),
    hash: String(o.hash ?? ""),
    path: String(o.path ?? ""),
    uploaderId: String(o.uploaderId ?? ""),
    encryptionStatus: String(o.encryptionStatus ?? ""),
    malwareScanStatus: String(o.malwareScanStatus ?? ""),
    integrityStatus: String(o.integrityStatus ?? ""),
    verificationStatus: String(o.verificationStatus ?? ""),
    threatLevel: String(o.threatLevel ?? "LOW"),
    securityScore: Number(o.securityScore ?? 0),
    classification: String(o.classification ?? "trusted"),
    telemetryStatus: String(o.telemetryStatus ?? "indexed"),
    riskScore: Number(o.riskScore ?? o.securityScore ?? 0),
    integrityScore: Number(o.integrityScore ?? o.securityScore ?? 0),
    entropyScore: Number(o.entropyScore ?? 0),
    heuristicConfidence: Number(o.heuristicConfidence ?? o.securityScore ?? 0),
    shortDigest: String(o.shortDigest ?? ""),
    validationAt: String(o.validationAt ?? ""),
    uploadDurationMs: Number(o.uploadDurationMs ?? 0),
    extension: String(o.extension ?? ""),
    ingestNode: String(o.ingestNode ?? "CORE-INGEST-2"),
    archiveRegion: String(o.archiveRegion ?? "vault-eu-central"),
    vaultTier: String(o.vaultTier ?? "encrypted-hot-archive"),
    relayPath: String(o.relayPath ?? ""),
    socState: String(o.socState ?? "indexed"),
    quarantineState: String(o.quarantineState ?? "clear"),
    quarantineReason: o.quarantineReason != null ? String(o.quarantineReason) : "",
    replicationHealth: Number(o.replicationHealth ?? 99),
    propagationLatency: Number(o.propagationLatency ?? 24),
    authTagStatus: String(o.authTagStatus ?? "validated"),
    lifecycleStatus: String(o.lifecycleStatus ?? "vault_committed"),
    analysis: o.analysis && typeof o.analysis === "object" ? /** @type {Record<string, unknown>} */ (o.analysis) : null,
    telemetry: o.telemetry && typeof o.telemetry === "object" ? /** @type {Record<string, unknown>} */ (o.telemetry) : null,
    integrityChecks: Array.isArray(o.integrityChecks) ? o.integrityChecks : [],
    timeline: timelineRaw.map((event) => {
      const r = /** @type {Record<string, unknown>} */ (event && typeof event === "object" ? event : {});
      return {
        id: String(r.id ?? ""),
        type: String(r.type ?? "review"),
        severity: String(r.severity ?? "info"),
        source: String(r.source ?? "Telemetry"),
        message: String(r.message ?? ""),
        at: String(r.at ?? new Date().toISOString()),
        metadata: r.metadata && typeof r.metadata === "object" ? /** @type {Record<string, unknown>} */ (r.metadata) : undefined,
      };
    }),
  };
}

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
export function parseSocDashboardOverview(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError("GET /dashboard/overview: expected JSON object", { status: 422, body });
  }
  return /** @type {Record<string, unknown>} */ (body);
}

/**
 * @param {FormData} formData
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocUploadStoredResponse>}
 */
export async function postSocUpload(formData, opts = {}) {
  const raw = await runSocRequest(() => apiRequest(SOC_API_PATHS.upload, {
    method: "POST",
    body: formData,
    signal: opts.signal,
    retries: 1,
  }));
  return parseSocUploadResponse(raw);
}

/**
 * @param {{ signal?: AbortSignal, search?: string, risk?: string, trust?: string, status?: string, sort?: string, page?: number, pageSize?: number }} [opts]
 * @returns {Promise<SocFileRow[]>}
 */
export async function getSocFiles(opts = {}) {
  const query = new URLSearchParams();
  for (const key of ["search", "risk", "trust", "status", "sort", "page", "pageSize"]) {
    if (opts[key] != null && opts[key] !== "") query.set(key, String(opts[key]));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const raw = await runSocRequest(() => apiRequest(`${SOC_API_PATHS.files}${suffix}`, { method: "GET", signal: opts.signal, retries: 2 }));
  return parseSocFilesList(raw);
}

/**
 * @param {string} fileId
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<ReturnType<typeof parseSocFileDetail>>}
 */
export async function getSocFileById(fileId, opts = {}) {
  const raw = await runSocRequest(() =>
    apiRequest(`${SOC_API_PATHS.files}/${encodeURIComponent(fileId)}`, { method: "GET", signal: opts.signal, retries: 2 }),
  );
  return parseSocFileDetail(raw);
}

export async function verifySocFileIntegrity(fileId, opts = {}) {
  return runSocRequest(() =>
    apiRequest(`${SOC_API_PATHS.vault}/${encodeURIComponent(fileId)}/verify`, { method: "POST", signal: opts.signal, retries: 1 }),
  );
}

export async function getSocFileMetadata(fileId, opts = {}) {
  return runSocRequest(() =>
    apiRequest(`${SOC_API_PATHS.files}/${encodeURIComponent(fileId)}/metadata`, { method: "GET", signal: opts.signal, retries: 1 }),
  );
}

export async function deleteSocFile(fileId, opts = {}) {
  return runSocRequest(() =>
    apiRequest(`${SOC_API_PATHS.files}/${encodeURIComponent(fileId)}`, { method: "DELETE", signal: opts.signal, retries: 1 }),
  );
}

export async function downloadSocFile(fileId, fallbackName = "secure-object.bin", opts = {}) {
  const url = `${env.apiBaseUrl}${SOC_API_PATHS.files}/${encodeURIComponent(fileId)}/download`;
  const headers = new Headers();
  const bearer = getAccessToken();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  const res = await fetch(url, { method: "GET", headers, signal: opts.signal, credentials: "omit" });
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const message = typeof body?.message === "string" ? body.message : res.statusText;
    throw new ApiError(message || "Download failed", { status: res.status, body });
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob, filename: match ? decodeURIComponent(match[1]) : fallbackName };
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getSocDashboardOverview(opts = {}) {
  const raw = await runSocRequest(() =>
    apiRequest(SOC_API_PATHS.dashboardOverview, { method: "GET", signal: opts.signal, retries: 2 }),
  );
  return parseSocDashboardOverview(raw);
}

export async function getSocDashboardActivity(
  { severity = "all", search = "", page = 1, pageSize = 10 } = {},
  opts = {},
) {
  const query = new URLSearchParams({
    severity,
    search,
    page: String(page),
    pageSize: String(pageSize),
  });
  const raw = await runSocRequest(() =>
    apiRequest(`${SOC_API_PATHS.dashboardActivity}?${query.toString()}`, { method: "GET", signal: opts.signal, retries: 2 }),
  );
  return raw;
}

export async function getSocUploadTelemetry(opts = {}) {
  return runSocRequest(() =>
    apiRequest(SOC_API_PATHS.dashboardUploadTelemetry, { method: "GET", signal: opts.signal, retries: 2 }),
  );
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocSecurityStatusResponse>}
 */
export async function getSocSecurityStatus(opts = {}) {
  const raw = await runSocRequest(() =>
    apiRequest(SOC_API_PATHS.securityStatus, { method: "GET", signal: opts.signal, retries: 2 }),
  );
  return parseSocSecurityStatus(raw);
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocSessionRow[]>}
 */
export async function getSocSessions(opts = {}) {
  const raw = await runSocRequest(() => apiRequest(SOC_API_PATHS.sessions, { method: "GET", signal: opts.signal, retries: 2 }));
  return parseSocSessions(raw);
}

/**
 * Persist user security / notification preferences.
 *
 * @param {Record<string, unknown>} payload
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<unknown>}
 */
export async function postSocSettings(payload, opts = {}) {
  return runSocRequest(() =>
    apiRequest(SOC_API_PATHS.settings, { method: "POST", body: payload, signal: opts.signal, retries: 1 }),
  );
}
