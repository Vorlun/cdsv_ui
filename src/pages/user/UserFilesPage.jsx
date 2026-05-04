import { FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import SocUserPageShell from "@/components/soc/SocUserPageShell";
import { useUserVaultFiles } from "@/hooks/useUserVaultFiles";

function statusStyle(status) {
  const u = status.toUpperCase();
  if (u.includes("SAFE") || u === "STORED" || u === "CLEARED") {
    return "bg-emerald-500/20 text-[#6EE7B7]";
  }
  if (u.includes("PEND") || u.includes("REVIEW")) {
    return "bg-amber-500/20 text-[#FCD34D]";
  }
  return "bg-rose-500/20 text-[#FCA5A5]";
}

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
  const { phase, files, error, reload } = useUserVaultFiles(user?.email);

  const empty = phase === "success" && files.length === 0;

  return (
    <SocUserPageShell
      title="My Files"
      subtitle="Vault index for evidence and operator uploads. Live mode binds to GET /files when VITE_USE_MOCK_API=false."
      badge={
        <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-200">
          Vault
        </span>
      }
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void reload()}
          disabled={phase === "loading"}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]"
        >
          <RefreshCw className={`h-4 w-4 ${phase === "loading" ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {phase === "loading" ? (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111827] py-14 text-slate-400"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" aria-hidden />
          <p className="text-sm">Loading vault index…</p>
        </div>
      ) : null}

      {phase === "error" ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/35 bg-rose-950/30 px-5 py-4 text-sm text-rose-100 shadow-[0_12px_40px_-24px_rgba(244,63,94,0.25)]"
        >
          <p className="font-medium text-white">Vault unavailable</p>
          <p className="mt-1 opacity-95">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/15 bg-[#0F172A]/80 px-6 py-16 text-center transition hover:border-sky-500/25">
          <FolderOpen className="h-12 w-12 text-slate-600" aria-hidden />
          <div>
            <p className="text-lg font-medium text-white">No files indexed yet</p>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Upload evidence from the SOC ingest console. Once the backend implements GET /files, this grid reflects your stored objects.
            </p>
          </div>
        </div>
      ) : null}

      {phase === "success" && files.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-inner">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Indexed objects</h2>
          <ul className="space-y-3">
            {files.map((file) => (
              <li
                key={file.id ?? file.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-sky-500/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#E5E7EB]">{file.name}</p>
                  <p className="mt-0.5 text-xs text-[#9CA3AF]">{formatUploadedAt(file.uploadedAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(file.status)}`}>
                  {file.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SocUserPageShell>
  );
}
