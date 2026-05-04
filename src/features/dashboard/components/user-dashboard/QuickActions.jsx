import { memo } from "react";
import { ArrowRight, FolderOpen, ShieldCheck, Upload } from "lucide-react";
import { Link } from "react-router-dom";

export default memo(function QuickActions({ isLight }) {
  const cardBase = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";

  const secondaryClasses = isLight
    ? "group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition duration-300 hover:border-sky-300/70 hover:bg-sky-50/60 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15)] hover:-translate-y-0.5 hover:shadow-md"
    : "group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm font-medium text-[#E5E7EB] transition duration-300 hover:border-sky-500/25 hover:bg-white/[0.06] hover:shadow-[0_0_28px_-8px_rgba(56,189,248,0.35)] hover:-translate-y-0.5";

  return (
    <section className={`${cardBase} p-5 transition duration-300 hover:shadow-[0_0_32px_-12px_rgba(56,189,248,0.2)] hover:-translate-y-0.5`}>
      <h3 className={`mb-4 text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Quick actions</h3>
      <div className="grid gap-3">
        <Link
          to="/upload"
          className={`group flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
            isLight ? "bg-sky-600 hover:bg-sky-700" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4 transition duration-300 group-hover:scale-110" aria-hidden /> Upload file
          </span>
          <ArrowRight className="h-4 w-4 opacity-80 transition duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link to="/files" className={secondaryClasses}>
          <span className="inline-flex items-center gap-2">
            <FolderOpen
              className={`h-4 w-4 shrink-0 text-sky-500 transition duration-300 group-hover:scale-105 ${isLight ? "" : ""}`}
              aria-hidden
            />{" "}
            View files
          </span>
          <ArrowRight className={`h-4 w-4 ${muted} transition duration-300 group-hover:translate-x-0.5`} />
        </Link>
        <Link to="/security" className={secondaryClasses}>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 shrink-0 text-emerald-500 transition duration-300 group-hover:scale-105`} aria-hidden /> Security status
          </span>
          <ArrowRight className={`h-4 w-4 ${muted} transition duration-300 group-hover:translate-x-0.5`} />
        </Link>
      </div>
    </section>
  );
});
