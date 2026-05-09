const ACCESS_TOKEN_KEY = "cdsv_access_token";
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    /* ignore storage availability errors */
  }
}

export function getAccessToken() {
  if (!accessToken) {
    try {
      accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      accessToken = null;
    }
  }
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore storage availability errors */
  }
}
