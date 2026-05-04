import { env } from "@/config/env";
import { ApiError } from "./apiError";
import { clearAccessToken, getAccessToken } from "@/utils/tokenMemory";

/**
 * JSON HTTP helper for production backends (`VITE_USE_MOCK_API=false`).
 * Bearer token is injected from memory by default — never persisted in cookies automatically here.
 */

export async function apiRequest(path, { method = "GET", body, token, headers: extraHeaders, signal } = {}) {
  if (env.useMockApi) {
    throw new ApiError(
      "Mock API mode is enabled. Use typed domain modules (authApi, logsApi) instead of generic apiRequest.",
      { status: 501 },
    );
  }

  const url = path.startsWith("http") ? path : `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(extraHeaders ?? undefined);
  const bearer = token ?? getAccessToken();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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
        : typeof parsed?.error === "string"
          ? parsed.error
          : res.statusText;
    throw new ApiError(msg || "Request failed", { status: res.status, body: parsed });
  }

  return parsed;
}

/** Clear client auth after global 401 from HTTP layer (optional interceptor hook). */
export function handleUnauthorizedClient() {
  clearAccessToken();
}
