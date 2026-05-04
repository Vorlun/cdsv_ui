/**
 * Authentication API façade — mocks by default (`VITE_USE_MOCK_API=true`).
 * Mirrors opaque access/refresh token flows used with API gateways in cloud telecom platforms.
 */

import { env } from "@/config/env";
import { delay } from "@/utils/delay";
import { ApiError } from "@/services/api/apiError";
import { apiRequest } from "@/services/api/apiRequest";
import {
  normalizeEmail,
  isPasswordStrongEnoughLogin,
  isValidEmail,
  isPasswordStrengthOkForRegister,
} from "@/utils/validation";
import { sanitizePlainText } from "@/utils/sanitize";
import { createOpaqueToken } from "./tokenFactory";

/** Demo principals — NEVER ship static credentials beyond lab environments. */
const MOCK_USERS = [
  {
    email: "admin@test.com",
    password: "Admin123!",
    role: "admin",
    fullName: "Admin Operator",
    socRole: "Admin",
  },
  {
    email: "user@test.com",
    password: "User123!",
    role: "user",
    fullName: "SOC Analyst",
    socRole: "Analyst",
  },
  {
    email: "viewer@test.com",
    password: "View123!",
    role: "admin",
    fullName: "SOC Read-only",
    socRole: "Viewer",
  },
];

async function simulateLatency(ms = 420) {
  await delay(ms);
}

const NAME_LS_PREFIX = "cdsv-profile-name-";
const PWD_LS_PREFIX = "cdsv-mock-pwd-overlay-";

/** @param {string} emailNorm */
export function readProfileFullName(emailNorm) {
  try {
    const v = window.localStorage.getItem(`${NAME_LS_PREFIX}${emailNorm}`)?.trim();
    return v ? sanitizePlainText(v, 120) : "";
  } catch {
    return "";
  }
}

/** @param {string} emailNorm */
export function writeProfileFullName(emailNorm, fullName) {
  try {
    window.localStorage.setItem(`${NAME_LS_PREFIX}${emailNorm}`, sanitizePlainText(fullName ?? "", 120));
  } catch {
    /* ignore */
  }
}

function readPasswordOverlay(emailNorm) {
  try {
    const v = window.localStorage.getItem(`${PWD_LS_PREFIX}${emailNorm}`);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function writePasswordOverlay(emailNorm, newPassword) {
  try {
    window.localStorage.setItem(`${PWD_LS_PREFIX}${emailNorm}`, newPassword);
  } catch {
    /* ignore */
  }
}

function findMockPrincipal(email) {
  return MOCK_USERS.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));
}

/** Used by Login + verification flows (supports mock credential rotation overlay). */
export function mockPasswordOk(email, password) {
  const m = findMockPrincipal(email);
  if (!m) return false;
  if (m.password === password) return true;
  const overlay = readPasswordOverlay(normalizeEmail(email));
  return overlay !== null && overlay !== undefined && overlay === password;
}

function issueTokenPair(ttlSeconds) {
  const accessToken = createOpaqueToken("at");
  const refreshToken = createOpaqueToken("rt");
  const expiresAt = Date.now() + ttlSeconds * 1000;
  return { accessToken, refreshToken, expiresIn: ttlSeconds, expiresAt };
}

function attemptMockLogin(email, password, ttlSeconds = 900) {
  const emailNorm = normalizeEmail(email);
  const match = findMockPrincipal(email);
  if (!match || !mockPasswordOk(email, password)) throw new ApiError("Invalid credentials.", { status: 401 });
  const display = readProfileFullName(emailNorm);
  return {
    ...issueTokenPair(ttlSeconds),
    role: match.role,
    user: {
      email: match.email,
      fullName: display || match.fullName,
      lastLogin: new Date().toISOString(),
      socRole: match.socRole ?? (match.role === "admin" ? "Admin" : "Analyst"),
    },
  };
}

function attemptMockRefresh(refreshToken, ttlSeconds = 900) {
  if (typeof refreshToken !== "string" || !refreshToken.startsWith("rt_")) {
    throw new ApiError("Invalid refresh token.", { status: 401 });
  }
  return issueTokenPair(ttlSeconds);
}

/**
 * Re-validates password without rotating tokens (workspace unlock, step-up).
 */
function attemptMockVerifyPassword(email, password) {
  if (!findMockPrincipal(email) || !mockPasswordOk(email, password)) {
    throw new ApiError("Invalid password.", { status: 401 });
  }
  return { ok: true };
}

/**
 * Mock credential rotation — persists overlay password for demo logins alongside static seeds.
 */
export async function changeAccountPassword({ email, currentPassword, newPassword }) {
  if (!isValidEmail(email)) throw new ApiError("Invalid email.", { status: 400 });
  if (!isPasswordStrongEnoughLogin(currentPassword) || !mockPasswordOk(email, currentPassword)) {
    throw new ApiError("Current password is incorrect.", { status: 401 });
  }
  if (!isPasswordStrengthOkForRegister(newPassword)) {
    throw new ApiError(
      "New password is too weak — use mixed case, numbers, symbols, minimum 8 characters.",
      { status: 400 },
    );
  }
  if (env.useMockApi) {
    await simulateLatency(620);
    writePasswordOverlay(normalizeEmail(email), newPassword);
    return { ok: true, changedAt: new Date().toISOString() };
  }
  await apiRequest("/auth/password", {
    method: "POST",
    body: { email: normalizeEmail(email), currentPassword, newPassword },
  });
  return { ok: true, changedAt: new Date().toISOString() };
}

/**
 * @returns {Promise<{ ok: true }>}
 */
export async function verifyUserPassword(email, password) {
  if (!isValidEmail(email) || !isPasswordStrongEnoughLogin(password)) {
    throw new ApiError("Provide a valid credential pair.", { status: 400 });
  }
  if (env.useMockApi) {
    await simulateLatency(240);
    return attemptMockVerifyPassword(email, password);
  }
  await apiRequest("/auth/verify-password", {
    method: "POST",
    body: { email: normalizeEmail(email), password },
  });
  return { ok: true };
}

/** @typedef {{ email: string, fullName: string }} RegisterProfile */
/** @returns {Awaited<{ accessToken: string, refreshToken: string, expiresIn: number, expiresAt: number, role: string, user: RegisterProfile & { lastLogin: string }}>} */
function buildMockRegister(profile) {
  return {
    ...issueTokenPair(900),
    role: "user",
    user: {
      email: normalizeEmail(profile.email),
      fullName: sanitizePlainText(profile.fullName || "New User", 120),
      lastLogin: new Date().toISOString(),
      socRole: "Analyst",
    },
  };
}

/**
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number, expiresAt: number, role: string, user: object }>}
 */
export async function loginCredentials({ email, password, rememberMe }) {
  if (!isValidEmail(email) || !isPasswordStrongEnoughLogin(password)) {
    throw new ApiError("Please provide a valid email and password (minimum 8 characters).", {
      status: 400,
    });
  }

  if (env.useMockApi) {
    await simulateLatency(520);
    const ttl = rememberMe ? 3600 : 900;
    return attemptMockLogin(email, password, ttl);
  }

  /** @todo Map to federation / OAuth2 token endpoint */
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email: normalizeEmail(email), password },
  });
}

/** Rotates opaque refresh credential (mock or HTTP). */
export async function rotateRefreshTokens(refreshToken) {
  if (env.useMockApi) {
    await simulateLatency(160);
    return attemptMockRefresh(refreshToken);
  }
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * @param {{ email: string, fullName: string }} params
 */
export async function registerUser({ email, fullName }) {
  if (!isValidEmail(email)) {
    throw new ApiError("Invalid email.", { status: 400 });
  }

  if (env.useMockApi) {
    await simulateLatency(720);
    return buildMockRegister({ email, fullName });
  }

  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      email: normalizeEmail(email),
      fullName: sanitizePlainText(fullName || "New User", 120),
    },
  });
}

export function validateRegistrationPassword(password) {
  return isPasswordStrengthOkForRegister(password);
}

export const AUTH_DEMO_ACCOUNTS_NOTICE =
  "Demo accounts — admin@test.com / Admin123! and user@test.com / User123!";
