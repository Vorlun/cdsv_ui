/**
 * Operator profile security (2FA posture, trusted devices) — persists per principal email.
 */

import { normalizeEmail } from "@/utils/validation";
import { sanitizePlainText } from "@/utils/sanitize";
import { deviceFingerprint } from "@/services/userWorkspaceStore";

const PREFIX = "cdsv-profile-security-";

function key(emailNorm) {
  return `${PREFIX}${emailNorm}`;
}

function read(emailNorm, fallback) {
  try {
    const raw = window.localStorage.getItem(key(emailNorm));
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      devices: Array.isArray(parsed.devices) ? parsed.devices : [...fallback.devices],
    };
  } catch {
    return { ...fallback };
  }
}

function write(emailNorm, data) {
  try {
    window.localStorage.setItem(key(emailNorm), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** @typedef {{ twoFactorEnabled: boolean, trustedOnly: boolean, devices: Array<{ id: string, label: string, fingerprint: string, trusted: boolean, userAgent?: string }> }} ProfileSecurity */

export function defaultProfileSecurity() {
  return {
    twoFactorEnabled: false,
    trustedOnly: false,
    devices: [],
  };
}

/** @param {string} email */
export function getProfileSecurity(email) {
  const emailNorm = normalizeEmail(email || "");
  const fallback = defaultProfileSecurity();
  if (!emailNorm) return fallback;
  let sec = read(emailNorm, fallback);
  if (!Array.isArray(sec.devices)) sec = { ...sec, devices: [] };
  const fp = deviceFingerprint();
  if (!sec.devices?.some((d) => d.fingerprint === fp)) {
    sec = {
      ...sec,
      devices: [
        {
          id: `td-${fp}`,
          label: "This browser",
          fingerprint: fp,
          trusted: true,
          userAgent: sanitizePlainText(navigator.userAgent.slice(0, 120), 120),
        },
        ...(sec.devices ?? []).filter((d) => d.fingerprint !== fp),
      ],
    };
    write(emailNorm, sec);
  }
  return sec;
}

/** @param {string} email @param {Partial<ProfileSecurity>} patch */
export function patchProfileSecurity(email, patch) {
  const emailNorm = normalizeEmail(email || "");
  if (!emailNorm) return { ok: false };
  const prev = getProfileSecurity(email);
  const next = { ...prev, ...patch, devices: patch.devices ?? prev.devices ?? [] };
  write(emailNorm, next);
  return { ok: true, security: next };
}

/** @param {string} email @param {string} deviceId */
export function setDeviceTrusted(email, deviceId, trusted) {
  const emailNorm = normalizeEmail(email || "");
  if (!emailNorm) return { ok: false };
  const sec = getProfileSecurity(email);
  const dev = sanitizePlainText(String(deviceId ?? ""), 120);
  const nextDevices = sec.devices.map((d) => (String(d.id) === dev ? { ...d, trusted } : d));
  return patchProfileSecurity(email, { devices: nextDevices });
}

/** @param {string} email @param {string} deviceId — cannot remove implicit current device row */
export function removeTrustedDeviceRow(email, deviceId) {
  if (!normalizeEmail(email || "")) return { ok: false, message: "No principal." };
  const fp = deviceFingerprint();
  const sec = getProfileSecurity(email);
  const target = sec.devices.find((d) => String(d.id) === String(deviceId));
  if (!target) return { ok: false, message: "Device not indexed." };
  if (target.fingerprint === fp) {
    return { ok: false, message: "You cannot remove this workstation from inventory while signed in here." };
  }
  const nextDevices = sec.devices.filter((d) => String(d.id) !== String(deviceId));
  return patchProfileSecurity(email, { devices: nextDevices });
}
