/**
 * Runtime configuration derived from Vite environment variables.
 * Only `VITE_*` keys are exposed to the browser bundle.
 */
export const env = Object.freeze({
  apiBaseUrl: String(import.meta.env.VITE_API_BASE_URL || "http://localhost:3005/api/v1").replace(/\/$/, ""),
  wsBaseUrl: String(import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3005/api/v1")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, ""),
  /** When true, domain calls use in-process mock implementations instead of HTTP. */
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== "false",
  appName: import.meta.env.VITE_APP_NAME || "CDSV Security Platform",
});

export default env;
