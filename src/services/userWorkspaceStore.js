/**
 * Client-side mock for sessions + API keys (per signed-in email). Persists in localStorage.
 */

import { sanitizePlainText } from "@/utils/sanitize";

const DEVICE_KEY = "cdsv-device-fingerprint";

export function deviceFingerprint() {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-fallback-${navigator.userAgent.slice(0, 24)}`;
  }
}

function storeKey(email, suffix) {
  return `cdsv-ws-${sanitizePlainText(String(email || "anon"), 120).toLowerCase()}-${suffix}`;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function randSecret() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function defaultSessionLedger(devFingerprint) {
  return [
    {
      id: `ses-${devFingerprint}`,
      label: "This workstation",
      deviceHint: sanitizePlainText(navigator.userAgent.slice(0, 72), 72),
      location: "Derived · local session",
      ip: "—",
      lastActiveAt: new Date().toISOString(),
      current: true,
      fingerprint: devFingerprint,
      revoked: false,
    },
    {
      id: `ses-mock-1`,
      label: "SOC laptop · Chrome",
      deviceHint: "Chrome / Windows 11",
      location: "London, UK",
      ip: "81.2.69.142",
      lastActiveAt: new Date(Date.now() - 900_000).toISOString(),
      current: false,
      fingerprint: "mock-1",
      revoked: false,
    },
    {
      id: `ses-mock-2`,
      label: "Carrier VPN · macOS",
      deviceHint: "Safari / macOS",
      location: "Frankfurt, DE",
      ip: "185.23.11.92",
      lastActiveAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
      current: false,
      fingerprint: "mock-2",
      revoked: false,
    },
  ];
}

/** Only non-terminated rows are returned — terminated replicas stay removed from catalog views (audit payloads may replay elsewhere). */
export function getWorkspaceSessions(email) {
  const key = storeKey(email, "sessions");
  const dev = deviceFingerprint();
  let list = readJson(key, []);
  if (!Array.isArray(list)) list = [];

  /** Preserve explicit revocations across legacy payloads */
  list = list.map((row) => ({ ...row, revoked: Boolean(row.revoked) }));

  let activeList = list.filter((s) => !s.revoked);
  if (activeList.length === 0) {
    list = defaultSessionLedger(dev);
    writeJson(key, list);
    activeList = list;
  }

  return activeList.map((row) =>
    row.fingerprint === dev ? { ...row, current: true, lastActiveAt: new Date().toISOString() } : { ...row, current: false },
  );
}

/** Active keys only — revoked secrets stay in storage until operator purges externally. */
export function getActiveApiKeys(email) {
  return getApiKeys(email).filter((k) => !k.revoked);
}

/** @param {string} email @param {string} sessionId */
export function terminateWorkspaceSession(email, sessionId) {
  const key = storeKey(email, "sessions");
  const dev = deviceFingerprint();
  const list = readJson(key, []);
  if (!Array.isArray(list)) return { ok: false, message: "No session index." };
  const normalized = list.map((row) => ({ ...row, revoked: Boolean(row.revoked) }));
  const target = normalized.find((s) => String(s.id) === String(sessionId));
  if (!target) return { ok: false, message: "Session not found." };
  if (target.revoked) return { ok: false, message: "Session already terminated." };
  if (target.fingerprint === dev) {
    return { ok: false, message: "You cannot terminate your current console session. Lock the workspace or logout instead." };
  }
  const next = normalized.map((s) =>
    String(s.id) === String(sessionId)
      ? {
          ...s,
          revoked: true,
          terminatedAt: new Date().toISOString(),
          current: false,
          label: s.label ? `${sanitizePlainText(s.label, 100)} · ended` : "Ended session",
        }
      : s,
  );
  writeJson(key, next);
  return { ok: true, sessions: getWorkspaceSessions(email) };
}

/** Convenience — drop terminated rows entirely from persisted ledger */
export function purgeTerminatedWorkspaceSessions(email) {
  const key = storeKey(email, "sessions");
  const list = readJson(key, []);
  if (!Array.isArray(list)) return;
  writeJson(
    key,
    list.filter((s) => !s.revoked),
  );
}

/** @param {string} email */
export function getApiKeys(email) {
  const key = storeKey(email, "apikeys");
  return readJson(key, []);
}

/** @param {string} email @param {string} label @param {"admin"|"user"} appRole */
export function createApiKey(email, label, appRole) {
  const max = appRole === "admin" ? 12 : 3;
  const key = storeKey(email, "apikeys");
  const list = readJson(key, []);
  if (!Array.isArray(list)) return { ok: false, message: "Corrupt API key index." };
  if (list.filter((k) => !k.revoked).length >= max) {
    return { ok: false, message: `Maximum ${max} active keys for ${appRole === "admin" ? "administrator" : "standard"} workspace.` };
  }
  const secret = `soc_${randSecret()}`;
  const prefix = secret.slice(0, 12);
  const rowStored = {
    id: `ak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: sanitizePlainText(label || "Unnamed key", 80),
    prefix,
    secretRedacted: `${prefix}…${secret.slice(-6)}`,
    createdAt: new Date().toISOString(),
    revoked: false,
  };
  writeJson(key, [rowStored, ...list]);
  return { ok: true, plainTextSecret: secret, record: rowStored };
}

/** @param {string} email @param {string} keyId */
export function revokeApiKey(email, keyId) {
  const key = storeKey(email, "apikeys");
  const list = readJson(key, []);
  if (!Array.isArray(list)) return { ok: false, message: "No API key ledger." };
  const next = list.map((k) => (String(k.id) === String(keyId) ? { ...k, revoked: true, revokedAt: new Date().toISOString() } : k));
  writeJson(key, next);
  return { ok: true, keys: next };
}
