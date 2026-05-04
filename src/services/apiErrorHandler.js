import { ApiError } from "@/services/api/apiError";

/**
 * Normalized operator-facing SOC API errors (retry UX, telemetry hooks).
 */
export function normalizeSocError(err) {
  if (err instanceof ApiError) {
    return {
      message: String(err.message || "Gateway error."),
      retryable: [502, 503, 504, 408, 429].includes(Number(err.status)),
      status: err.status,
      body: err.body,
    };
  }
  if (err && typeof err === "object" && "message" in err) {
    return {
      message: String(err.message),
      retryable: false,
      status: undefined,
      body: undefined,
    };
  }
  return {
    message: "Unexpected SOC client failure.",
    retryable: false,
    status: undefined,
    body: undefined,
  };
}
