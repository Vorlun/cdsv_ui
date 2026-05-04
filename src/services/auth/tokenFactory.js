export function createOpaqueToken(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}
