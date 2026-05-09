import { memo } from "react";
import { ArrowRight, FolderOpen, ShieldCheck, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const CHECK_STATES = ["VERIFIED", "ACTIVE", "RELAY ONLINE", "SYNCED"];

export default memo(function QuickActions({ isLight, onboardingSteps = [] }) {
  const cardBase = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-sm"
    : "rounded-3xl border border-white/10 bg-gradient-to-br from-[#081120] to-[#0b1730]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";

  const secondaryClasses = isLight
    ? "group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 transition duration-300 hover:border-sky-300/70 hover:bg-sky-50/60 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.15)] hover:-translate-y-0.5 hover:shadow-md"
    : "group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-[#0F172A] to-[#0d223e] px-3 py-2.5 text-sm font-medium text-[#E5E7EB] transition duration-300 hover:border-sky-500/25 hover:bg-white/[0.06] hover:shadow-[0_0_28px_-8px_rgba(56,189,248,0.35)] hover:-translate-y-0.5";

  return (
    <section className={`${cardBase} p-4 transition duration-300 hover:shadow-[0_0_30px_-12px_rgba(56,189,248,0.22)]`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Quick actions</h3>
          <p className={`text-[11px] ${muted}`}>SOC operator workflow controls.</p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-300">
          ready
        </span>
      </div>
      <div className="grid gap-2">
        <Link
          to="/upload"
          className={`group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
            isLight ? "bg-sky-600 hover:bg-sky-700" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
          }`}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Upload className="h-4 w-4 transition duration-300 group-hover:scale-110 group-hover:rotate-3" aria-hidden />
            <span>
              <span className="block">Secure ingestion</span>
              <span className="block text-[10px] font-normal text-white/75">CORE-INGEST-2 · TLS verified</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 opacity-80 transition duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link to="/files" className={secondaryClasses}>
          <span className="inline-flex items-center gap-2">
            <FolderOpen
              className={`h-4 w-4 shrink-0 text-sky-500 transition duration-300 group-hover:scale-105 ${isLight ? "" : ""}`}
              aria-hidden
            />
            Vault objects
          </span>
          <ArrowRight className={`h-4 w-4 ${muted} transition duration-300 group-hover:translate-x-0.5`} />
        </Link>
        <Link to="/security" className={secondaryClasses}>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 shrink-0 text-emerald-500 transition duration-300 group-hover:scale-105`} aria-hidden /> Assurance center
          </span>
          <ArrowRight className={`h-4 w-4 ${muted} transition duration-300 group-hover:translate-x-0.5`} />
        </Link>
      </div>
      <div className={`mt-2 rounded-2xl border p-2.5 text-xs ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-[#0F172A] text-[#94A3B8]"}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold uppercase tracking-wide">Ingestion profile</p>
          <span className="text-[10px] font-semibold text-emerald-300">Vault sync active</span>
        </div>
        <p className="mt-1">CSV/JSON/TXT · 10MB · SHA-256 · AES-256-GCM · DLP scan · SOC-EAST</p>
      </div>
      {onboardingSteps.length ? (
        <div className={`mt-2.5 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0F172A]"}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Operational checklist</p>
            <span className="text-[10px] font-semibold text-cyan-300">workflow 4/4</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {onboardingSteps.map((step, index) => (
              <Link
                key={step.id}
                to={step.to}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  isLight ? "hover:bg-white" : "hover:bg-white/[0.04]"
                }`}
              >
                <span>
                  <span className="font-medium">{index + 1}. {step.title}</span>
                  <span className={`ml-2 text-[10px] ${muted}`}>{index % 2 ? "TRUST-ZONE-2" : "SOC-EAST"}</span>
                </span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">{CHECK_STATES[index % CHECK_STATES.length]}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className={`mt-3 flex items-center gap-2 text-xs ${muted}`}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
        Relay pipeline healthy · telemetry connected
      </div>
    </section>
  );
});
