import { sanitizePlainText } from "@/utils/sanitize";

/**
 * Lightweight geographic risk uplift for roaming / corridor fraud tiers (telecom SOC mock).
 * @returns {number} additive uplift 0–22
 */
export function computeGeographicThreatFactor(locationLabel, ipHint = "") {
  const hay = sanitizePlainText(
    `${String(locationLabel ?? "")} ${String(ipHint ?? "")}`,
    200,
  ).toLowerCase();

  if (
    hay.includes("north korea") ||
    hay.includes("iran") ||
    hay.includes("crimea") ||
    hay.includes("unknown pop")
  ) {
    return 20;
  }
  if (hay.includes("nigeria") || hay.includes("pakistan") || hay.includes("syria")) return 13;
  if (hay.includes("russia") || hay.includes("romania") || hay.includes("bulgaria")) return 11;
  if (hay.includes("singapore") || hay.includes("netherlands") || hay.includes("switzerland")) return 12;
  if (hay.includes("brazil") || hay.includes("mexico") || hay.includes("india")) return 8;
  return 4;
}
