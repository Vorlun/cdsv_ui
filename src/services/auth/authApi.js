/**
 * Authentication API facade for live backend integration.
 */

import { ApiError } from "@/services/api/apiError";
import { apiRequest } from "@/services/api/apiRequest";
import {
  normalizeEmail,
  isPasswordStrongEnoughLogin,
  isValidEmail,
  isPasswordStrengthOkForRegister,
} from "@/utils/validation";
import { sanitizePlainText } from "@/utils/sanitize";

const NAME_LS_PREFIX = "cdsv-profile-name-";

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

export async function changeAccountPassword({ email, currentPassword, newPassword }) {
  if (!isValidEmail(email)) throw new ApiError("Invalid email.", { status: 400 });
  if (!isPasswordStrongEnoughLogin(currentPassword)) {
    throw new ApiError("Current password is required.", { status: 400 });
  }
  if (!isPasswordStrengthOkForRegister(newPassword)) {
    throw new ApiError(
      "New password is too weak — use mixed case, numbers, symbols, minimum 8 characters.",
      { status: 400 },
    );
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
  await apiRequest("/auth/verify-password", {
    method: "POST",
    body: { email: normalizeEmail(email), password },
  });
  return { ok: true };
}

/**
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number, expiresAt: number, role: string, user: object }>}
 */
export async function loginCredentials({ email, password, rememberMe: _rememberMe }) {
  if (!isValidEmail(email) || !isPasswordStrongEnoughLogin(password)) {
    throw new ApiError("Please provide a valid email and password (minimum 8 characters).", {
      status: 400,
    });
  }

  const emailNorm = normalizeEmail(email);
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: { email: emailNorm, password },
  });

  // Static admin override: admin@test.com always gets admin role.
  // Guards against stale server processes or legacy tokens.
  if (result && emailNorm === "admin@test.com") {
    result.role = "admin";
    if (result.user) {
      result.user.fullName = result.user.fullName || "SOC Analyst";
      result.user.email  = result.user.email  || emailNorm;
    }
  }

  return result;
}

/** Rotates refresh credential against backend. */
export async function rotateRefreshTokens(refreshToken) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * @param {{ email: string, fullName: string, password: string }} params
 */
export async function registerUser({ email, fullName, password }) {
  if (!isValidEmail(email)) {
    throw new ApiError("Invalid email.", { status: 400 });
  }
  if (!isPasswordStrongEnoughLogin(password)) {
    throw new ApiError("Password must be at least 8 characters.", { status: 400 });
  }

  const payload = {
    email: normalizeEmail(email),
    fullName: sanitizePlainText(fullName || "New User", 120),
    password,
  };
  return apiRequest("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function validateRegistrationPassword(password) {
  return isPasswordStrengthOkForRegister(password);
}
