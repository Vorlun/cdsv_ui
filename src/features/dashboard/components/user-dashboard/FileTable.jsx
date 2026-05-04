import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { sanitizePlainText } from "@/utils/sanitize";
import { formatRelativeShort } from "./formatters";
import { EmptyStateCard, UploadCtaLink } from "./EmptyStates";
import FileDetailModal from "./FileDetailModal";
import { formatStatusLabel, statusBadgeClasses } from "./userStatusStyles";

export default memo(function FileTable({ recentFiles, isLight }) {
  const [detail, setDetail] = useState(null);
  const cardBase = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const tableHead = isLight ? "border-slate-200 bg-slate-50/90 text-slate-500" : "border-white/10 bg-[#0f172a]/85 text-[#9CA3AF]";
  const tableRow = isLight ? "border-slate-100" : "border-white/5";
  const rowHover = isLight ? "cursor-pointer hover:bg-sky-50/50" : "cursor-pointer hover:bg-white/[0.04]";

  return (
    <>
      <section className={`${cardBase} overflow-hidden transition duration-300 hover:shadow-[0_0_32px_-14px_rgba(56,189,248,0.15)]`}>
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${
            isLight ? "border-slate-200" : "border-white/[0.08]"
          }`}
        >
          <div>
            <h3 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Recent uploads</h3>
            <p className={`text-xs ${muted}`}>Latest five objects landing in your tenant bucket (mock).</p>
          </div>
          <Link className={`text-xs font-semibold transition hover:underline ${isLight ? "text-sky-700" : "text-[#93C5FD]"}`} to="/files">
            Open file center
          </Link>
        </div>
        {recentFiles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide backdrop-blur-sm ${tableHead}`}>
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map((f, index) => (
                  <tr
                    key={f.id}
                    className={`group/row border-b transition-colors duration-200 ${tableRow} ${rowHover}`}
                    onClick={() => setDetail(f)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetail(f);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${sanitizePlainText(f.name, 80)}`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`font-medium transition group-hover/row:underline ${
                          isLight ? "text-sky-800" : "text-[#BFDBFE]"
                        }`}
                      >
                        {sanitizePlainText(f.name, 120)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusBadgeClasses(f.status, isLight)}`}
                      >
                        {formatStatusLabel(f.status)}
                      </span>
                    </td>
                    <td className={`px-5 py-3 tabular-nums ${muted}`}>{f.sizeLabel}</td>
                    <td className={`px-5 py-3 text-xs tabular-nums ${muted}`}>
                      <time dateTime={f.uploadedAt}>{formatRelativeShort(f.uploadedAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyStateCard
              isLight={isLight}
              title="No activity yet"
              description="Upload your first file to see it listed here with status and timestamps."
              action={<UploadCtaLink label="Upload File" isLight={isLight} />}
            />
          </div>
        )}
      </section>

      {detail ? <FileDetailModal file={detail} isLight={isLight} open onClose={() => setDetail(null)} /> : null}
    </>
  );
});
