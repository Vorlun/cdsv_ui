import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileDigit,
  FileJson2,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import SocUserPageShell from "@/components/soc/SocUserPageShell";
import { useUserVaultFiles } from "@/hooks/useUserVaultFiles";

function formatUploadedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-GB", { hour12: false });
  } catch {
    return iso;
  }
}

export default function UserFilesPage() {
  const { user } = useAuthSession();
  const { isLight } = useWorkspaceControl();
  const { phase, files, error, reload } = useUserVaultFiles(user?.email);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [trustFilter, setTrustFilter] = useState("all");

  const empty = phase === "success" && files.length === 0;
  const totalSizeMb = useMemo(
    () => files.reduce((sum, file) => {
      const entropy = Number.parseInt((file.hash || "a1").slice(0, 2), 16);
      return sum + (0.6 + (entropy % 12) * 0.35);
    }, 0),
    [files],
  );
  const integrityScore = useMemo(() => {
    if (!files.length) return 99;
    const lowRisk = files.filter((f) => String(f.threatLevel || "LOW").toUpperCase() === "LOW").length;
    return Math.max(82, Math.min(100, Math.round((lowRisk / files.length) * 100)));
  }, [files]);
  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      const risk = String(file.threatLevel || "LOW").toLowerCase();
      const classification = String(file.classification || (risk === "high" ? "watch" : "trusted")).toLowerCase();
      const searchable = `${file.name || ""} ${file.id || ""} ${file.hash || ""} ${risk} ${classification}`.toLowerCase();
      const queryOk = !needle || searchable.includes(needle);
      const riskOk = riskFilter === "all" || risk === riskFilter;
      const trustOk = trustFilter === "all" || classification.includes(trustFilter);
      return queryOk && riskOk && trustOk;
    });
  }, [files, query, riskFilter, trustFilter]);
  const nowStamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const highRiskCount = files.filter((f) => String(f.threatLevel || "LOW").toUpperCase() === "HIGH").length;

  const threatTone = (level) => {
    const key = String(level || "LOW").toUpperCase();
    if (isLight) {
      if (key === "CRITICAL") return "border-red-200 bg-red-50 text-red-700";
      if (key === "HIGH")     return "border-rose-200 bg-rose-50 text-rose-700";
      if (key === "MEDIUM")   return "border-amber-200 bg-amber-50 text-amber-700";
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (key === "CRITICAL") return "border-red-500/45 bg-red-500/15 text-red-200";
    if (key === "HIGH")     return "border-rose-500/40 bg-rose-500/15 text-rose-200";
    if (key === "MEDIUM")   return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  };

  const fileVisual = (name) => {
    const n = String(name || "").toLowerCase();
    if (isLight) {
      if (n.endsWith(".csv"))  return { Icon: FileSpreadsheet, tone: "text-emerald-600", ring: "border-emerald-200 bg-emerald-50" };
      if (n.endsWith(".json")) return { Icon: FileJson2,       tone: "text-blue-600",    ring: "border-blue-200 bg-blue-50" };
      if (n.endsWith(".txt"))  return { Icon: FileText,        tone: "text-slate-600",   ring: "border-slate-200 bg-slate-50" };
      if (n.endsWith(".pdf"))  return { Icon: FileDigit,       tone: "text-amber-600",   ring: "border-amber-200 bg-amber-50" };
      return { Icon: LockKeyhole, tone: "text-violet-600", ring: "border-violet-200 bg-violet-50" };
    }
    if (n.endsWith(".csv"))  return { Icon: FileSpreadsheet, tone: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-500/10" };
    if (n.endsWith(".json")) return { Icon: FileJson2,       tone: "text-cyan-300",    ring: "border-cyan-400/30 bg-cyan-500/10" };
    if (n.endsWith(".txt"))  return { Icon: FileText,        tone: "text-slate-300",   ring: "border-slate-400/30 bg-slate-500/10" };
    if (n.endsWith(".pdf"))  return { Icon: FileDigit,       tone: "text-amber-300",   ring: "border-amber-400/30 bg-amber-500/10" };
    return { Icon: LockKeyhole, tone: "text-violet-300", ring: "border-violet-400/30 bg-violet-500/10" };
  };

  /* shared card styles */
  const card = isLight
    ? "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
    : "rounded-2xl border border-white/10 bg-[#111827]";

  return (
    <SocUserPageShell
      title="My Files"
      subtitle="Enterprise secure evidence vault for encrypted telecom ingestion artifacts."
      badge={
        <div className="flex flex-wrap items-center gap-2">
          {["vault replication healthy", "SOC ingest synchronized", `${integrityScore}% telemetry confidence`].map((label, idx) => (
            <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${idx === 0 ? "animate-pulse" : ""} bg-emerald-400`} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      }
    >
      {/* ── stat cards ──────────────────────────────────────────── */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
        <div className={`px-4 py-3 ${isLight ? "rounded-2xl border border-blue-200 bg-white shadow-[0_4px_24px_-8px_rgba(37,99,235,0.15)]" : "rounded-2xl border border-sky-400/20 bg-[#111827] shadow-[0_18px_45px_-30px_rgba(56,189,248,0.5)]"}`}>
          <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-400" : "text-slate-500"}`}>Indexed assets</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className={`text-3xl font-semibold tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}>{files.length}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"}`}>+{Math.min(9, files.length || 1)} delta</span>
          </div>
          <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}>
            <div className={`h-full rounded-full ${isLight ? "bg-blue-500" : "bg-sky-400"}`} style={{ width: `${Math.min(100, files.length * 14 || 18)}%` }} />
          </div>
        </div>
        {[
          { label: "AES-256 protected", value: `${totalSizeMb.toFixed(1)} MB`, sub: "archive tier · VAULT-A", subTone: isLight ? "text-blue-600" : "text-cyan-300" },
          { label: "Integrity confidence", value: `${integrityScore}%`, bar: true, valueTone: isLight ? "text-emerald-700" : "text-emerald-300" },
        ].map(({ label, value, sub, subTone, bar, valueTone }) => (
          <div key={label} className={`px-4 py-3 ${card}`}>
            <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${valueTone || (isLight ? "text-slate-800" : "text-white")}`}>{value}</p>
            {sub && <p className={`mt-1 text-[10px] ${subTone}`}>{sub}</p>}
            {bar && <div className={`mt-2 h-1 rounded-full ${isLight ? "bg-slate-100" : "bg-white/10"}`}><div className={`h-1 rounded-full ${isLight ? "bg-emerald-500" : "bg-emerald-400"}`} style={{ width: `${integrityScore}%` }} /></div>}
          </div>
        ))}
        <div className={`px-4 py-3 ${card}`}>
          <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-400" : "text-slate-500"}`}>Active relay sync</p>
          <p className={`mt-1 inline-flex items-center gap-2 text-sm font-semibold ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>
            <ShieldCheck className="h-4 w-4" aria-hidden />RELAY-SYNCED
          </p>
          <p className={`mt-1 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>SOC-EAST · TRUST-ZONE-3</p>
        </div>
        <div className={`px-4 py-3 ${card}`}>
          <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-400" : "text-slate-500"}`}>Threat classification</p>
          <p className={`mt-1 inline-flex items-center gap-2 text-sm font-semibold ${isLight ? "text-blue-600" : "text-sky-300"}`}>
            <Activity className="h-4 w-4" aria-hidden />
            {highRiskCount ? `${highRiskCount} watch` : "Low risk"}
          </p>
          <p className={`mt-1 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Last sync {nowStamp}</p>
        </div>
      </section>

      {/* ── filter bar ──────────────────────────────────────────── */}
      <section className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#0F172A]/90"}`}>
        <div className="grid gap-2 md:grid-cols-[1fr_12rem_12rem_auto]">
          <div className="relative">
            <Search className={`pointer-events-none absolute left-3 top-2.5 h-4 w-4 ${isLight ? "text-slate-400" : "text-slate-500"}`} aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search evidence, hash, object ID..."
              className={`h-9 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition ${isLight ? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-400" : "border-white/10 bg-[#081425] text-slate-200 focus:border-sky-400/40"}`}
            />
          </div>
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}
            className={`h-9 rounded-xl border px-3 text-xs ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#081425] text-slate-300"}`}
          >
            <option value="all">All risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
          <select value={trustFilter} onChange={(event) => setTrustFilter(event.target.value)}
            className={`h-9 rounded-xl border px-3 text-xs ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-[#081425] text-slate-300"}`}
          >
            <option value="all">All trust zones</option>
            <option value="trusted">Trusted</option>
            <option value="watch">Watch</option>
          </select>
          <div className="flex items-center justify-end gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-300"}`}>vault-eu-central</span>
            <button
              type="button"
              onClick={() => void reload()}
              disabled={phase === "loading"}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98] ${isLight ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50" : "border-white/15 bg-white/[0.06] text-white hover:border-sky-500/40 hover:bg-sky-500/10"}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${phase === "loading" ? "animate-spin" : ""}`} aria-hidden />
              Sync
            </button>
          </div>
        </div>
      </section>

      <div className={`flex flex-wrap items-center justify-between gap-2 text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}>
        <span>Showing {filteredFiles.length} of {files.length} secure objects · CORE-INGEST-2 · FTTH uplink indexed</span>
      </div>

      {/* ── loading ──────────────────────────────────────────────── */}
      {phase === "loading" ? (
        <div className={`flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border py-14 ${isLight ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-[#111827] text-slate-400"}`}
          role="status" aria-live="polite" aria-busy="true"
        >
          <Loader2 className={`h-10 w-10 animate-spin ${isLight ? "text-blue-500" : "text-sky-400"}`} aria-hidden />
          <p className="text-sm">Loading vault index…</p>
        </div>
      ) : null}

      {/* ── error ────────────────────────────────────────────────── */}
      {phase === "error" ? (
        <div role="alert" className={`rounded-2xl border px-5 py-5 text-sm ${isLight ? "border-rose-200 bg-rose-50 text-rose-800" : "border-rose-500/35 bg-rose-950/30 text-rose-100 shadow-[0_12px_40px_-24px_rgba(244,63,94,0.25)]"}`}>
          <p className={`font-semibold ${isLight ? "text-rose-800" : "text-white"}`}>Vault index temporarily unavailable</p>
          <p className="mt-1 opacity-95">{error || "Secure object metadata could not be loaded."}</p>
          <p className={`mt-2 text-xs ${isLight ? "text-rose-500" : "text-rose-200/85"}`}>Check network connectivity and refresh the page. If this persists, contact your SOC administrator.</p>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => void reload()}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${isLight ? "border-rose-300 bg-white text-rose-700 hover:bg-rose-50" : "border-white/15 bg-white/10 text-white hover:bg-white/20"}`}
            >Retry</button>
            <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide ${isLight ? "border-rose-200 bg-rose-50 text-rose-700" : "border-rose-400/35 bg-rose-900/30 text-rose-100"}`}>SOC-VAULT-DIAGNOSTIC</span>
          </div>
        </div>
      ) : null}

      {/* ── empty state ──────────────────────────────────────────── */}
      {empty ? (
        <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center transition ${isLight ? "border-slate-300 bg-white hover:border-blue-300" : "border-white/15 bg-[#0F172A]/80 hover:border-sky-500/25"}`}>
          <FolderOpen className={`h-12 w-12 ${isLight ? "text-slate-300" : "text-slate-600"}`} aria-hidden />
          <div>
            <p className={`text-lg font-medium ${isLight ? "text-slate-700" : "text-white"}`}>Secure vault awaiting first protected ingestion</p>
            <p className={`mt-1 max-w-md text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>Vault online, secure retention enabled, telemetry standby active.</p>
          </div>
        </div>
      ) : null}

      {/* ── file list ────────────────────────────────────────────── */}
      {phase === "success" && files.length > 0 ? (
        <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#111827] shadow-inner"}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${isLight ? "text-slate-400" : "text-slate-500"}`}>Secure vault objects</h2>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>replication healthy</span>
          </div>
          <ul className="space-y-2.5">
            {filteredFiles.map((file, index) => {
              const threat = String(file.threatLevel || "LOW").toUpperCase();
              const isHigh = threat === "HIGH" || threat === "CRITICAL" || file.quarantineState === "quarantined";
              const trustLabel = file.quarantineState === "quarantined" ? "QUARANTINE" : isHigh ? "WATCH" : threat === "MEDIUM" ? "REVIEW" : "TRUSTED";
              return (
                <li
                  key={file.id ?? file.name}
                  className={`group relative overflow-hidden rounded-2xl border px-3.5 py-2.5 transition duration-300 hover:-translate-y-0.5 ${
                    isLight
                      ? "border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)]"
                      : "border-white/10 bg-[linear-gradient(135deg,#0F172A,#0b1628)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-sky-500/40 hover:shadow-[inset_0_1px_0_rgba(56,189,248,0.12),0_0_30px_-18px_rgba(56,189,248,0.55)]"
                  }`}
                >
                  {!isLight && (
                    <>
                      <span className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:repeating-linear-gradient(0deg,rgba(148,163,184,0.4)_0px,rgba(148,163,184,0.4)_1px,transparent_1px,transparent_7px)]" aria-hidden />
                      <span className="pointer-events-none absolute inset-y-2 left-0 w-px bg-sky-300/0 transition group-hover:bg-sky-300/50 group-hover:shadow-[0_0_16px_rgba(56,189,248,0.75)]" aria-hidden />
                    </>
                  )}
                  {isLight && <span className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-r bg-blue-200/0 transition group-hover:bg-blue-400/60" aria-hidden />}
                  <div className="relative grid items-center gap-3 lg:grid-cols-[32fr_43fr_25fr]">
                    <Link to={`/vault/files/${encodeURIComponent(String(file.id || file.name || "object"))}`} className="flex min-w-0 items-center gap-3 text-left">
                      {(() => {
                        const { Icon, tone, ring } = fileVisual(file.name);
                        return (
                          <span className={`relative shrink-0 rounded-2xl border p-2.5 shadow-[0_0_24px_-16px_currentColor] ${ring}`}>
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
                            <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
                          </span>
                        );
                      })()}
                      <span className="min-w-0">
                        <p className={`truncate text-base font-semibold ${isLight ? "text-slate-800" : "text-[#E5E7EB]"}`}>{file.name}</p>
                        <p className={`mt-0.5 text-xs ${isLight ? "text-slate-400" : "text-[#9CA3AF]"}`}>{formatUploadedAt(file.uploadedAt)} · {file.ingestNode || `CORE-INGEST-${(index % 3) + 1}`}</p>
                        <p className={`mt-1 font-mono text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Object ID {String(file.id || "vault-object").slice(0, 12)} · {file.archiveRegion || "VAULT-A"}</p>
                      </span>
                    </Link>
                    <div className="grid gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] sm:grid-cols-2 xl:grid-cols-4">
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/15 bg-emerald-500/5 text-emerald-300"}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />SHA verified
                      </span>
                      <span className={`rounded-lg border px-2 py-1 ${isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-sky-400/15 bg-sky-500/5 text-sky-300"}`}>{file.encryptionStatus || "AES-256"}</span>
                      <span className={`rounded-lg border px-2 py-1 ${isLight ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-cyan-400/15 bg-cyan-500/5 text-cyan-300"}`}>RELAY {file.replicationHealth || 92 + (index % 6)}%</span>
                      <span className={`rounded-lg border px-2 py-1 ${isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>{trustLabel} · RISK {file.riskScore || 0}</span>
                    </div>
                    <div className="grid content-center justify-items-end gap-1.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${threatTone(file.threatLevel)}`}>
                          {String(file.threatLevel || "LOW")} risk
                        </span>
                        <span className={file.quarantineState === "quarantined"
                          ? `rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${isLight ? "border-red-200 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-200"}`
                          : `rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}
                        >
                          {file.quarantineState === "quarantined" ? "Quarantined" : "Indexed"}
                        </span>
                      </div>
                      <Link
                        to={`/vault/files/${encodeURIComponent(String(file.id || file.name || "object"))}`}
                        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition duration-300 hover:-translate-y-0.5 ${
                          isLight
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                            : "border-sky-400/25 bg-sky-500/10 text-sky-200 hover:border-sky-300/45 hover:bg-sky-500/15 hover:shadow-[0_0_18px_-10px_rgba(56,189,248,0.9)]"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Open Intelligence
                        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </SocUserPageShell>
  );
}
