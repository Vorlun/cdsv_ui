/**
 * SOC-facing REST facade for secure upload & posture telemetry.
 * All paths are appended to {@link import("@/config/env").env.apiBaseUrl}.
 *
 * Set `VITE_USE_MOCK_API=false` with a reachable `VITE_API_BASE_URL` to use HTTP.
 */

import { env } from "@/config/env";
import { apiRequest } from "./api/apiRequest";
import { ApiError } from "./api/apiError";

export const SOC_API_PATHS = Object.freeze({
  upload: "/upload",
  files: "/files",
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
 *   cloud: number
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
  const threatLevel = String(o.threatLevel ?? "");
  const encRaw = o.encryption != null ? String(o.encryption) : "";
  const securityScore =
    typeof o.securityScore === "number" ? o.securityScore : Number(o.securityScore ?? NaN);
  assertNumber(securityScore, "securityScore");
  if (!fileId || !hash) throw new ApiError("POST /upload: missing fileId or hash", { status: 422, body });
  if (encRaw && encRaw !== "AES-256-GCM") {
    throw new ApiError("POST /upload: encryption must be AES-256-GCM when supplied", { status: 422, body });
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
    };
  });
}

/**
 * @param {FormData} formData
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocUploadStoredResponse>}
 */
export async function postSocUpload(formData, opts = {}) {
  if (env.useMockApi) {
    throw new ApiError("postSocUpload: enable live API (VITE_USE_MOCK_API=false)", { status: 501 });
  }
  const raw = await apiRequest(SOC_API_PATHS.upload, {
    method: "POST",
    body: formData,
    signal: opts.signal,
  });
  return parseSocUploadResponse(raw);
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocFileRow[]>}
 */
export async function getSocFiles(opts = {}) {
  if (env.useMockApi) {
    throw new ApiError("getSocFiles: enable live API (VITE_USE_MOCK_API=false)", { status: 501 });
  }
  const raw = await apiRequest(SOC_API_PATHS.files, { method: "GET", signal: opts.signal });
  return parseSocFilesList(raw);
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocSecurityStatusResponse>}
 */
export async function getSocSecurityStatus(opts = {}) {
  if (env.useMockApi) {
    throw new ApiError("getSocSecurityStatus: enable live API (VITE_USE_MOCK_API=false)", { status: 501 });
  }
  const raw = await apiRequest(SOC_API_PATHS.securityStatus, { method: "GET", signal: opts.signal });
  return parseSocSecurityStatus(raw);
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<SocSessionRow[]>}
 */
export async function getSocSessions(opts = {}) {
  if (env.useMockApi) {
    throw new ApiError("getSocSessions: enable live API (VITE_USE_MOCK_API=false)", { status: 501 });
  }
  const raw = await apiRequest(SOC_API_PATHS.sessions, { method: "GET", signal: opts.signal });
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
  if (env.useMockApi) {
    throw new ApiError("postSocSettings: enable live API (VITE_USE_MOCK_API=false)", { status: 501 });
  }
  return apiRequest(SOC_API_PATHS.settings, { method: "POST", body: payload, signal: opts.signal });
}
