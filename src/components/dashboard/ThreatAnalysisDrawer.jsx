import { memo, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldAlert, X } from "lucide-react";

function classify(event) {
  const severity = String(event?.severity ?? "info").toLowerCase();
  if (severity === "critical" || severity === "high") return "Active mitigation";
  if (severity === "medium") return "Isolated anomaly";
  return "Verified secure event";
}

export default memo(function ThreatAnalysisDrawer({ event, isLight, onClose }) {
  const open = Boolean(event);
  const ref = useRef(null);
  const model = useMemo(() => {
    if (!event) return null;
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
    const severity = String(event.severity ?? "info").toLowerCase();
    const confidence = Math.min(98, Math.max(12, Number(metadata.anomalyConfidence ?? (severity === "high" ? 76 : severity === "medium" ? 48 : 18))));
    return {
      reason: event.description || event.message || "Telecom security telemetry event.",
      node: event.node || metadata.node || (String(event.source ?? "").includes("Gateway") ? "API Gateway" : "FTTH Edge Node"),
      inspection: severity === "high" || severity === "medium" ? "packet pattern isolated" : "packet flow verified",
      integrity: `${metadata.packetIntegrityScore ?? 98.6}%`,
      encryption: `${metadata.encryptedTrafficRate ?? 97.2}% encrypted`,
      mitigation: severity === "high" ? "quarantine edge flow and enforce re-authentication" : severity === "medium" ? "isolate packet signature and monitor relay" : "continue baseline monitoring",
      confidence,
      classification: classify(event),
    };
  }, [event]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    ref.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && model ? (
        <>
          <motion.button className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Close threat analysis" />
          <motion.aside
            ref={ref}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`fixed right-0 top-0 z-[61] h-screen w-full max-w-[460px] border-l p-5 shadow-2xl ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0b1628] text-[#e5e7eb]"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>Threat Analysis</p>
                <h3 className="mt-1 text-lg font-semibold">{event.source || "SOC telemetry"}</h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={`mt-4 rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0f172a]"}`}>
              <div className="flex items-start gap-3">
                <ShieldAlert className={event.severity === "high" || event.severity === "critical" ? "mt-0.5 h-5 w-5 text-rose-300" : "mt-0.5 h-5 w-5 text-amber-300"} />
                <div>
                  <p className="text-sm font-semibold">{model.classification}</p>
                  <p className={`mt-1 text-xs ${isLight ? "text-slate-600" : "text-[#a8bdd8]"}`}>{model.reason}</p>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["Affected node", model.node],
                ["Packet inspection", model.inspection],
                ["Integrity verification", model.integrity],
                ["Encryption status", model.encryption],
                ["Mitigation action", model.mitigation],
                ["Confidence score", `${model.confidence}%`],
                ["Security classification", model.classification],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-xl border px-3 py-2.5 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#111827]"}`}>
                  <dt className={`text-[11px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{label}</dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
});
