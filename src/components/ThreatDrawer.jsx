import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Clock3,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Trash2,
  UserRoundX,
  X,
} from "lucide-react";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#9CA3AF]">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-[#E5E7EB]">{value}</p>
    </div>
  );
}

export default function ThreatDrawer({
  isOpen,
  threat,
  onClose,
  onBlockIP,
  onMarkSafe,
  onDeleteFile,
}) {
  return (
    <AnimatePresence>
      {isOpen && threat ? (
        <>
          <motion.button
            type="button"
            aria-label="Close threat drawer"
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 z-[60] flex h-screen w-full max-w-md flex-col border-l border-white/10 bg-[#0F172A] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
                <h2 className="text-lg font-semibold text-[#E5E7EB]">Threat Details</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="rounded-2xl border border-white/10 bg-[#111827]/70 p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Detection Overview
                </p>
                <div className="space-y-3">
                  <InfoRow icon={FileText} label="File name" value={threat.file} />
                  <InfoRow icon={Siren} label="Threat type" value={threat.type} />
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#9CA3AF]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Severity</span>
                    </div>
                    <span
                      className={[
                        "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
                        threat.severity === "safe"
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "",
                        threat.severity === "danger"
                          ? "bg-[#EF4444]/15 text-[#EF4444]"
                          : "bg-[#F59E0B]/15 text-[#F59E0B]",
                      ].join(" ")}
                    >
                      {threat.severity === "danger"
                        ? "Critical"
                        : threat.severity === "warning"
                          ? "Warning"
                          : "Safe"}
                    </span>
                  </div>
                  <InfoRow icon={UserRoundX} label="IP address" value={threat.ip} />
                  <InfoRow icon={Clock3} label="Timestamp" value={threat.time} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827]/70 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Description
                </p>
                <p className="text-sm leading-relaxed text-[#D1D5DB]">
                  {threat.description}
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => onBlockIP?.(threat)}
                  className="rounded-xl bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#DC2626]"
                >
                  Block IP
                </button>
                <button
                  type="button"
                  onClick={() => onMarkSafe?.(threat)}
                  disabled={threat.severity === "safe"}
                  className="rounded-xl bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Mark as Safe
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFile?.(threat)}
                  className="rounded-xl border border-[#EF4444]/40 px-4 py-2.5 text-sm font-semibold text-[#FCA5A5] transition-colors hover:bg-[#EF4444]/10"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Delete File
                  </span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
