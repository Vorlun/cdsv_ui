const SESSION_KEY = "cdsv_session_v1";

/** @typedef {{ email: string, fullName: string, lastLogin?: string }} PublicUserSnap */
/** @typedef {{ version: number, refreshToken: string, rememberMe: boolean, role: string, user: PublicUserSnap }} PersistedEnvelope */

/**
 * Session envelope persisted in sessionStorage only (tab-scoped).
 * NOTE: Refresh tokens remain readable by XSS in SPA models; production telecom stacks
 * should prefer HttpOnly, Secure, SameSite cookies bound to API domain.
 */

export function readPersistedSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.version !== 1 || typeof data.refreshToken !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {PersistedEnvelope} envelope */
export function writePersistedSession(envelope) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(envelope));
}

export function clearPersistedSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
