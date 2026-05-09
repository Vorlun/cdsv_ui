import { memo } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { sanitizePlainText } from "@/utils/sanitize";
import { formatAbsolute, formatRelativeShort } from "./formatters";

const severityPalette = {
  critical: { dot: "bg-red-400", ring: "shadow-[0_0_24px_-14px_rgba(248,113,113,0.9)]", textLight: "text-red-800", textDark: "text-red-200", badge: "critical" },
  high: { dot: "bg-orange-400", ring: "shadow-[0_0_22px_-14px_rgba(251,146,60,0.8)]", textLight: "text-orange-800", textDark: "text-orange-200", badge: "high" },
  medium: { dot: "bg-amber-400", ring: "shadow-[0_0_20px_-15px_rgba(245,158,11,0.75)]", textLight: "text-amber-700", textDark: "text-amber-300", badge: "medium" },
  low: { dot: "bg-cyan-400", ring: "", textLight: "text-cyan-700", textDark: "text-cyan-300", badge: "low" },
  info: { dot: "bg-blue-400", ring: "", textLight: "text-blue-700", textDark: "text-blue-300", badge: "info" },
};

export default memo(function SIEMEventCard({
  row,
  meta,
  tone,
  muted,
  isLight,
  isExpanded,
  isLatest,
  onToggle,
  onInspect,
}) {
  const palette = severityPalette[String(row.severity || "info").toLowerCase()] || severityPalette.info;
  const severityClass = isLight ? palette.textLight : palette.textDark;
  const tags = Array.isArray(row.tags) ? row.tags : [];

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -14, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={
        isLight
          ? `flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 ${palette.ring}`
          : `flex gap-3 rounded-2xl border border-white/10 bg-[#0F172A]/90 px-3.5 py-2.5 ${palette.ring}`
      }
    >
      <span className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${palette.dot} ${isLatest ? "animate-pulse" : ""}`} aria-hidden />
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isLight ? "bg-white shadow-sm ring-1 ring-slate-200/80" : "bg-[#111827] ring-1 ring-white/10"}`}>
        <meta.Icon className={`h-4 w-4 transition duration-300 ${tone}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={`text-sm font-medium ${isLight ? "text-slate-900" : "text-[#e5e7eb]"}`}>{meta.label}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClass} ${isLight ? "border-slate-200" : "border-white/15"}`}>
            {palette.badge}
          </span>
          {row.source ? <span className={`text-[11px] ${muted}`}>[{row.source}]</span> : null}
          <time className={`text-sm tabular-nums ${muted}`} dateTime={row.at}>
            {formatRelativeShort(row.at)} · {formatAbsolute(row.at)}
          </time>
        </div>
        <p className={`truncate text-xs ${muted}`} title={row.file}>
          {sanitizePlainText(row.file || "Secure object reference unavailable", 120)}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"}`}>
            {row.node || "SOC-EAST"}
          </span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/15 bg-[#111827] text-[#a7b9d3]"}`}>
            {row.trustZone || "TRUST-ZONE-3"}
          </span>
          {tags.slice(0, 4).map((tag) => (
            <span
              key={`${row.id}-${tag}`}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/15 bg-[#111827] text-[#a7b9d3]"}`}
            >
              <ShieldAlert className="h-3 w-3" aria-hidden />
              {tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`mt-1 inline-flex items-center gap-1 text-[11px] ${isLight ? "text-sky-700" : "text-sky-300"}`}
        >
          Details
          <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onInspect}
          className={`ml-3 inline-flex items-center gap-1 text-[11px] ${isLight ? "text-slate-700" : "text-cyan-300"}`}
        >
          Analyze
        </button>
        {isExpanded ? (
          <div className={`mt-1 rounded-lg border px-2 py-1.5 text-[11px] ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1422]"}`}>
            <p className={muted}>{sanitizePlainText(row.description || "No details", 260)}</p>
            <p className={`mt-1 ${muted}`}>Category: {row.category || "telemetry"}</p>
            <p className={`mt-1 ${muted}`}>
              Node: {row.node || "node-3"} · Cluster: {row.cluster || "vault-cluster"} · Pipeline: {row.pipeline || "secure-upload"}
            </p>
            <p className={`mt-1 ${muted}`}>
              Relay: {row.relaySource || "RELAY-EAST-01"} · Route: {row.packetRoute || "FTTH-EDGE -> SOC-EAST"} · Validation {row.validationLatencyMs || 22}ms
            </p>
          </div>
        ) : null}
      </div>
    </motion.li>
  );
});
