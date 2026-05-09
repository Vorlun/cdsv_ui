/** Shared helpers for admin upload monitoring / forensic UI */

export const THREAT_COLORS = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#22D3EE",
  none: "#34D399",
};

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };

export function threatColor(level) {
  const key = String(level ?? "none").toLowerCase();
  return THREAT_COLORS[key] ?? "#94A3B8";
}

export function formatThreatLevelLabel(level) {
  const l = String(level ?? "none").trim();
  if (!l) return "None";
  return l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
}

export function threatBadgeClasses(level) {
  const l = String(level ?? "none").toLowerCase();
  const map = {
    critical:
      "border-rose-500/35 bg-rose-500/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse",
    high:
      "border-orange-500/35 bg-orange-500/12 text-orange-100 shadow-[0_0_10px_rgba(249,115,22,0.28)] animate-pulse",
    medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    low: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    none: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  };
  return map[l] ?? map.none;
}

export function scanBadgeClasses(status) {
  if (!status) return "border-slate-500/30 bg-slate-500/15 text-slate-400";
  const s = String(status).toLowerCase();
  if (s.includes("pending") || s.includes("queued") || s.includes("scanning")) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  if (s.includes("clean") || s.includes("pass") || s.includes("completed")) {
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-200";
  }
  if (s.includes("suspicious") || s.includes("warn")) {
    return "border-amber-400/30 bg-amber-500/12 text-amber-200";
  }
  if (s.includes("infected") || s.includes("fail")) {
    return "border-rose-500/35 bg-rose-500/12 text-rose-200";
  }
  return "border-slate-500/30 bg-slate-500/15 text-slate-400";
}

export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

export function truncate(str, n = 30) {
  if (!str) return "—";
  const s = String(str);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Analytics `threatLevelDistribution` → chart rows */
export function threatDistributionFromAnalytics(analytics) {
  const raw = analytics?.threatLevelDistribution;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return [...raw]
    .map(({ level, count }) => ({
      level: formatThreatLevelLabel(level),
      count: Number(count) || 0,
      color: threatColor(level),
      rawLevel: String(level ?? ""),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => (SEVERITY_ORDER[a.rawLevel.toLowerCase()] ?? 9) - (SEVERITY_ORDER[b.rawLevel.toLowerCase()] ?? 9));
}

/** Fallback: derive distribution from current file rows */
export function threatDistributionFromFiles(files) {
  const entries = Object.entries(
    (files ?? []).reduce((acc, f) => {
      const l = String(f.threatLevel ?? "none").toLowerCase();
      acc[l] = (acc[l] ?? 0) + 1;
      return acc;
    }, {}),
  );
  return entries
    .sort((a, b) => (SEVERITY_ORDER[a[0]] ?? 5) - (SEVERITY_ORDER[b[0]] ?? 5))
    .map(([lvl, count]) => ({
      level: formatThreatLevelLabel(lvl),
      count,
      color: threatColor(lvl),
      rawLevel: lvl,
    }));
}

export function malwareBreakdownFromAnalytics(analytics) {
  const raw = analytics?.malwareScanDistribution;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const palette = ["#38BDF8", "#A78BFA", "#FBBF24", "#FB7185", "#34D399", "#94A3B8"];
  return raw.slice(0, 8).map((row, i) => ({
    name: String(row.status ?? "unknown"),
    count: Number(row.count) || 0,
    color: palette[i % palette.length],
  }));
}
