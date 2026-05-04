import { Modal } from "@/features/dashboard/components/DashboardModals";
import { formatAbsolute, formatRelativeShort } from "./formatters";
import { formatStatusLabel, normalizeFileStatus, statusBadgeClasses } from "./userStatusStyles";
import { sanitizePlainText } from "@/utils/sanitize";

export default function FileDetailModal({ file, isLight, open, onClose }) {
  if (!open || !file) return null;

  const st = normalizeFileStatus(file.status);
  const dotClass = st === "blocked" ? "bg-red-500" : st === "pending" ? "bg-amber-400" : "bg-emerald-500";

  return (
    <Modal title="File detail" onClose={onClose} tone={isLight ? "light" : "dark"}>
      <div className="space-y-4">
        <div>
          <p className={isLight ? "text-xs font-medium uppercase tracking-wide text-slate-500" : "text-xs font-medium uppercase tracking-wide text-[#64748b]"}>
            Name
          </p>
          <p className={`mt-1 break-all text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#e5e7eb]"}`}>
            {sanitizePlainText(file.name, 220)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={isLight ? "text-xs text-slate-500" : "text-xs text-[#94a3b8]"}>Status</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusBadgeClasses(st, isLight)}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
            {formatStatusLabel(st)}
          </span>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className={`rounded-xl ${isLight ? "bg-slate-50 ring-1 ring-slate-200/80" : "bg-[#0f172a] ring-1 ring-white/10"} px-3 py-2.5`}>
            <dt className={isLight ? "text-xs text-slate-500" : "text-xs text-[#94a3b8]"}>Size</dt>
            <dd className={`mt-1 font-medium tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}>{file.sizeLabel}</dd>
          </div>
          <div className={`rounded-xl ${isLight ? "bg-slate-50 ring-1 ring-slate-200/80" : "bg-[#0f172a] ring-1 ring-white/10"} px-3 py-2.5`}>
            <dt className={isLight ? "text-xs text-slate-500" : "text-xs text-[#94a3b8]"}>Uploaded</dt>
            <dd className={`mt-1 font-medium tabular-nums ${isLight ? "text-slate-900" : "text-white"}`}>
              <time dateTime={file.uploadedAt}>{formatRelativeShort(file.uploadedAt)}</time>
            </dd>
            <dd className={`mt-0.5 text-[11px] ${isLight ? "text-slate-500" : "text-[#64748b]"}`}>{formatAbsolute(file.uploadedAt)}</dd>
          </div>
        </dl>
        <div className={`rounded-lg px-3 py-2 font-mono text-[11px] ${isLight ? "bg-slate-100 text-slate-600" : "bg-black/25 text-[#94a3b8]"}`}>
          Object id · {sanitizePlainText(file.id, 48)}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={
          isLight
            ? "mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            : "mt-5 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-[#e5e7eb] transition hover:bg-white/[0.14]"
        }
      >
        Close
      </button>
    </Modal>
  );
}
