import { memo } from "react";
import { Activity as ActivityIcon, Download, LogIn, RefreshCw, ScanLine, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { sanitizePlainText } from "@/utils/sanitize";
import { EmptyStateCard, UploadCtaLink } from "./EmptyStates";
import { formatAbsolute, formatRelativeShort } from "./formatters";

const ACTIVITY_META = {
  upload: { label: "Upload", Icon: Upload, iconToneLight: "text-sky-600", iconToneDark: "text-sky-400" },
  scan: { label: "Malware scan", Icon: ScanLine, iconToneLight: "text-emerald-600", iconToneDark: "text-emerald-400" },
  download: { label: "Download", Icon: Download, iconToneLight: "text-violet-600", iconToneDark: "text-violet-300" },
  review: { label: "Pending review", Icon: RefreshCw, iconToneLight: "text-amber-600", iconToneDark: "text-amber-400" },
  login: { label: "Console login", Icon: LogIn, iconToneLight: "text-slate-600", iconToneDark: "text-slate-400" },
};

export default memo(function ActivityList({ rows, isLight }) {
  const cardBase = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";

  return (
    <section
      id="recent-activity"
      className={`${cardBase} p-5 transition duration-300 hover:shadow-[0_0_32px_-14px_rgba(56,189,248,0.18)]`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Recent activity</h3>
          <p className={`text-xs ${muted}`}>Live stream simulation — newest events first (demo).</p>
        </div>
        <ActivityIcon className={`h-5 w-5 transition hover:animate-pulse ${muted}`} aria-hidden />
      </div>
      {rows.length ? (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {rows.map((row) => {
              const meta = ACTIVITY_META[row.type] ?? ACTIVITY_META.upload;
              const Icon = meta.Icon;
              const tone = isLight ? meta.iconToneLight : meta.iconToneDark;

              return (
                <motion.li
                  key={row.id}
                  layout="position"
                  initial={{ opacity: 0, x: -14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={
                    isLight
                      ? "flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                      : "flex gap-3 rounded-xl border border-white/5 bg-[#0F172A]/85 px-3 py-2.5"
                  }
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isLight ? "bg-white shadow-sm ring-1 ring-slate-200/80" : "bg-[#111827] ring-1 ring-white/10"
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition duration-300 ${tone}`} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className={`text-sm font-medium ${isLight ? "text-slate-900" : "text-[#e5e7eb]"}`}>{meta.label}</span>
                      <time className={`text-xs tabular-nums ${muted}`} dateTime={row.at}>
                        {formatRelativeShort(row.at)} · {formatAbsolute(row.at)}
                      </time>
                    </div>
                    <p className={`truncate text-xs ${muted}`} title={row.file}>
                      {row.type === "login" ? "Console session handshake" : `File · ${sanitizePlainText(row.file, 120)}`}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyStateCard
          isLight={isLight}
          title="No activity yet"
          description="Upload your first file to generate audit events on this timeline."
          action={<UploadCtaLink label="Upload File" isLight={isLight} />}
        />
      )}
    </section>
  );
});
