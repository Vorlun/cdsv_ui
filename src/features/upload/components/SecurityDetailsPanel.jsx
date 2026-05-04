import { memo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Activity, Database, FolderOpen, Hash, Layers, Shield, Timer } from "lucide-react";

function verdictUi(verdict, isLight) {
  const v = String(verdict || "").toUpperCase();
  if (v === "THREAT")
    return {
      label: "THREAT",
      wrap: isLight ? "border-red-200 bg-red-50 text-red-900" : "border-red-500/40 bg-red-500/10 text-red-200",
    };
  return {
    label: "SAFE",
    wrap: isLight ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  };
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default memo(function SecurityDetailsPanel({ result, isLight }) {
  if (!result) return null;

  const vs = verdictUi(result.verdict, isLight);
  const muted = isLight ? "text-slate-500" : "text-[#94a3b8]";
  const card = isLight ? "rounded-xl border border-slate-200 bg-white" : "rounded-xl border border-white/10 bg-[#0c1222]";

  const row = (Icon, label, value) => (
    <div className={`flex gap-3 py-2.5 ${isLight ? "border-slate-100" : "border-white/5"} border-b last:border-b-0`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${muted}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}>{label}</p>
        <p className={`mt-0.5 break-all font-mono text-xs ${isLight ? "text-slate-900" : "text-[#e2e8f0]"}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`mt-6 overflow-hidden ${card}`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/[0.03]"}`}>
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${isLight ? "text-sky-600" : "text-sky-400"}`} aria-hidden />
          <span className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Security details</span>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${vs.wrap}`}>{vs.label}</span>
      </div>

      <div className="px-4 py-1">
        {row(Layers, "Encryption", result.encryption ?? "—")}
        {row(Hash, "File hash (SHA-256)", result.hash ?? "—")}
        {row(
          Shield,
          "Scan result",
          `${vs.label} · AV: ${result.scan?.antivirus ?? "—"} · Heuristics: ${result.scan?.heuristics ?? "—"}`,
        )}
        {row(Activity, "Risk score (0–100)", String(result.scan?.score ?? "—"))}
        {row(Database, "Storage", result.storage ?? "—")}
        {row(Hash, "File fingerprint", result.fingerprint ?? "—")}
        {row(Timer, "Ingest completed", formatWhen(result.uploadCompletedAt))}
      </div>

      <div className={`border-t px-4 py-3 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-white/10 bg-black/20"}`}>
        <Link
          to="/files"
          className={`inline-flex items-center gap-2 text-sm font-semibold transition hover:gap-2.5 ${isLight ? "text-sky-700" : "text-[#93c5fd]"}`}
        >
          <FolderOpen className="h-4 w-4" aria-hidden />
          View in My Files
        </Link>
      </div>
    </motion.div>
  );
});
