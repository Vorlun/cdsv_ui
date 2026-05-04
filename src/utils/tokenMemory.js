/**
 * In-memory only — access tokens never touch localStorage/sessionStorage (XSS mitigation).
 * Survives until tab close / full reload (then refresh token flow restores session).
 */
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}
