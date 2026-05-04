import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export function Modal({ title, children, onClose, tone = "dark" }) {
  const isLight = tone === "light";
  const containerRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const firstButton = containerRef.current?.querySelector("button");
    firstButton?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-label="Close dialog overlay"
      />
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        className={
          isLight
            ? "fixed left-1/2 top-1/2 z-[61] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            : "fixed left-1/2 top-1/2 z-[61] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl"
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={
              isLight
                ? "rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                : "rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
            }
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ReportDrawer({ open, onClose, onExportPdf, onRerunScan, reportTimestamp }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close report drawer backdrop"
          />
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%", opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.92 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed right-0 top-0 z-[61] flex h-screen w-full max-w-[420px] flex-col border-l border-[#3B82F6]/25 bg-[#0F172A] shadow-[-18px_0_45px_rgba(59,130,246,0.14)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0F172A]/95 px-5 py-4 backdrop-blur">
              <h3 className="text-base font-semibold text-[#E5E7EB]">Security Scan Report</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-xl border border-white/10 bg-[#111827] p-3">
                <p className="text-xs text-[#9CA3AF]">Timestamp</p>
                <p className="text-sm font-medium text-[#E5E7EB]">{reportTimestamp}</p>
              </div>

              <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3">
                <p className="text-xs uppercase tracking-wide text-[#FCD34D]">Scan Summary</p>
                <div className="mt-2 space-y-1 text-[#E5E7EB]">
                  <p>
                    Status: <span className="text-[#FCD34D]">Medium Severity Anomalies Detected</span>
                  </p>
                  <p>
                    Security Health Score: <span className="font-semibold">92/100</span>
                  </p>
                  <p>Medium Alerts: 4</p>
                  <p>Blocked Requests Today: 22</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">Detected Issues</p>
                {[
                  { issue: "Suspicious login bursts detected", severity: "Medium" },
                  { issue: "Repeated failed token validation attempts", severity: "Medium" },
                  { issue: "High API request spike blocked", severity: "Low" },
                  { issue: "Unknown IP probing behavior", severity: "Medium" },
                ].map((item) => (
                  <div key={item.issue} className="rounded-xl border border-white/10 bg-[#111827] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[#E5E7EB]">{item.issue}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          item.severity === "Low"
                            ? "bg-[#10B981]/20 text-[#6EE7B7]"
                            : "bg-[#F59E0B]/20 text-[#FCD34D]"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 bg-[#0F172A]/95 px-5 py-3 backdrop-blur">
              <button
                type="button"
                onClick={onExportPdf}
                className="flex-1 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-xs text-[#BFDBFE] hover:bg-[#3B82F6]/20"
              >
                Export Evidence Pack
              </button>
              <button
                type="button"
                onClick={() => {
                  onRerunScan?.();
                }}
                className="flex-1 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-xs text-[#A7F3D0] hover:bg-[#10B981]/20"
              >
                Re-run Scan
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
