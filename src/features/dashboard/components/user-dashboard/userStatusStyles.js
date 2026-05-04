/** Workspace file status palette: SAFE green, PENDING yellow, BLOCKED red */

export function normalizeFileStatus(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "blocked") return "blocked";
  if (s === "pending") return "pending";
  return "safe";
}

export function formatStatusLabel(status) {
  switch (normalizeFileStatus(status)) {
    case "blocked":
      return "BLOCKED";
    case "pending":
      return "PENDING";
    default:
      return "SAFE";
  }
}

export function statusBadgeClasses(status, isLight) {
  const s = normalizeFileStatus(status);
  if (s === "safe") {
    return isLight
      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
      : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35";
  }
  if (s === "blocked") {
    return isLight ? "bg-red-100 text-red-900 ring-1 ring-red-200" : "bg-red-500/15 text-red-300 ring-1 ring-red-500/40";
  }
  return isLight ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200" : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35";
}

export function securityScoreColor(score, isLight) {
  const n = Number(score);
  if (n >= 80) return isLight ? "text-emerald-600" : "text-emerald-400";
  if (n >= 50) return isLight ? "text-amber-600" : "text-amber-300";
  return isLight ? "text-red-600" : "text-red-400";
}

export function securityBarColor(score) {
  const n = Number(score);
  if (n >= 80) return "bg-emerald-500";
  if (n >= 50) return "bg-amber-500";
  return "bg-red-500";
}
