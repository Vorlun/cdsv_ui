import { env } from "@/config/env";
import { ApiError } from "./apiError";
import { clearAccessToken, getAccessToken } from "@/utils/tokenMemory";

/**
 * JSON HTTP helper for production backends (`VITE_USE_MOCK_API=false`).
 * Bearer token is injected from memory by default — never persisted in cookies automatically here.
 */

const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(error) {
  return error instanceof TypeError || error?.name === "AbortError";
}

/** Raw binary helper — skips JSON unwrap (used for SOC downloads). */
export async function apiBlobRequest(path, { method = "GET", token, signal } = {}) {
  const url = path.startsWith("http") ? path : `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers();
  const bearer = token ?? getAccessToken();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);

  const res = await fetch(url, {
    method,
    headers,
    signal,
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text();
    let parsed = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    const msg =
      typeof parsed?.message === "string"
        ? parsed.message
        : typeof parsed?.error?.message === "string"
          ? parsed.error.message
          : res.statusText;
    if (res.status === 401) handleUnauthorizedClient();
    throw new ApiError(msg || "Request failed", { status: res.status, body: parsed });
  }

  const blob = await res.blob();
  return {
    blob,
    contentType: res.headers.get("Content-Type") ?? "application/octet-stream",
    contentDisposition: res.headers.get("Content-Disposition"),
  };
}

export async function apiRequest(path, { method = "GET", body, token, headers: extraHeaders, signal, retries = DEFAULT_RETRIES } = {}) {
  const url = path.startsWith("http") ? path : `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(extraHeaders ?? undefined);
  const bearer = token ?? getAccessToken();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal,
        credentials: "omit",
      });

      const text = await res.text();
      let parsed = text;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      } else parsed = null;

      if (!res.ok) {
        const msg =
          typeof parsed?.message === "string"
            ? parsed.message
            : typeof parsed?.error?.message === "string"
              ? parsed.error.message
            : typeof parsed?.error === "string"
              ? parsed.error
              : res.statusText;

        if (res.status === 401) {
          handleUnauthorizedClient();
        }

        if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
          await sleep(250 * (attempt + 1));
          continue;
        }

        throw new ApiError(msg || "Request failed", { status: res.status, body: parsed });
      }

      if (parsed && typeof parsed === "object" && Object.prototype.hasOwnProperty.call(parsed, "success")) {
        const wrapped = /** @type {{ success?: boolean, data?: unknown, message?: string }} */ (parsed);
        if (wrapped.success === false) {
          throw new ApiError(wrapped.message || "Request failed", { status: res.status, body: parsed });
        }
        return wrapped.data ?? null;
      }
      return parsed;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt < retries && isNetworkError(error)) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw new ApiError("Network request failed", { status: 0, body: error });
    }
  }

  throw new ApiError("Request failed after retries", { status: 500 });
}

/** Clear client auth after global 401 from HTTP layer (optional interceptor hook). */
export function handleUnauthorizedClient() {
  clearAccessToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cdsv:auth:unauthorized"));
  }
}
