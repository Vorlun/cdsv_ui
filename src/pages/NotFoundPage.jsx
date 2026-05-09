import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1e38]">
          <ShieldOff className="h-9 w-9 text-cyan-400/70" />
        </div>

        {/* Code */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-500">
          404 — Route Not Found
        </p>

        {/* Title */}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Unauthorized navigation
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The route you requested is not registered in the SOC navigation tree.
          Return to your workspace or use the sidebar to navigate.
        </p>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            Return to dashboard
          </button>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-slate-600">
          CDSV Telecom Forensic Platform
        </p>
      </div>
    </div>
  );
}
