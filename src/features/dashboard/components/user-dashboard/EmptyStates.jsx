import { Link } from "react-router-dom";
import { Upload } from "lucide-react";

export function EmptyStateCard({ title, description, action, isLight }) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-8 ${
        isLight ? "border-slate-300 bg-slate-50" : "border-white/15 bg-[#0f172a]/80"
      } text-center`}
    >
      <p className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#e2e8f0]"}`}>{title}</p>
      <p className={`mx-auto mt-2 max-w-md text-xs ${isLight ? "text-slate-600" : "text-[#94a3b8]"}`}>{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function EmptyStateCompact({ isLight }) {
  return (
    <p
      className={`mt-4 rounded-lg border border-dashed px-4 py-6 text-center text-sm ${
        isLight ? "border-slate-300 text-slate-600" : "border-white/15 text-[#94a3b8]"
      }`}
    >
      No catalogued files yet — upload to seed triage metrics.
    </p>
  );
}

export function UploadCtaLink({ label, isLight }) {
  return (
    <Link
      to="/upload"
      className={`group/up inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
        isLight ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
      }`}
    >
      <Upload className="h-4 w-4 transition duration-300 group-hover/up:-translate-y-0.5 group-hover/up:scale-105" aria-hidden />
      {label}
    </Link>
  );
}
