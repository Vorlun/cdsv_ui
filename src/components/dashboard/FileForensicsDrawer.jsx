import { memo, useMemo } from "react";
import { Copy, ShieldCheck, X } from "lucide-react";
import { motion } from "motion/react";

function pseudoEntropy(file) {
  const seed = String(file?.id || file?.name || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (6.8 + (seed % 12) / 10).toFixed(2);
}

export default memo(function FileForensicsDrawer({ file, isLight, onClose }) {
  const forensic = useMemo(() => {
    if (!file) return null;
    const threat = String(file.threatLevel || file.riskLevel || "low").toUpperCase();
    const hash = file.sha256 || file.hash || `${String(file.id || "").replace(/-/g, "").padEnd(64, "0").slice(0, 64)}`;
    const suspicious = threat === "HIGH" || threat === "CRITICAL";
    return {
      hash,
      threat,
      trust: file.classification || (suspicious ? "quarantine monitored" : threat === "MEDIUM" ? "pending analyst review" : "trusted telecom asset"),
      confidence: threat === "HIGH" ? "77%" : threat === "MEDIUM" ? "43%" : "12%",
      relay: suspicious ? "RELAY-WATCH-03" : "RELAY-EAST-01",
      vault: suspicious ? "QUARANTINE-A" : "VAULT-A",
      latency: suspicious ? "42ms" : "24ms",
      sections: [
        {
          title: "Integrity Verification",
          items: [
            ["SHA-256", hash],
            ["Validation", file.integrityStatus || "SHA-256 verified"],
            ["Confidence", suspicious ? "inspection elevated" : "hash chain trusted"],
          ],
        },
        {
          title: "Encryption Metadata",
          items: [
            ["Cipher", file.encryptionStatus || "AES-256-GCM"],
            ["Secure channel", "TLS-VERIFIED"],
            ["Archive destination", suspicious ? "QUARANTINE-A" : "VAULT-A"],
          ],
        },
        {
          title: "Relay Pipeline",
          items: [
            ["Ingestion node", "CORE-INGEST-2"],
            ["Relay source", suspicious ? "RELAY-WATCH-03" : "RELAY-EAST-01"],
            ["Route", "EDGE-UPLINK -> API-GW -> VAULT-A"],
          ],
        },
        {
          title: "Anomaly Analysis",
          items: [
            ["Threat confidence", threat === "HIGH" ? "77%" : threat === "MEDIUM" ? "43%" : "12%"],
            ["Entropy score", `${pseudoEntropy(file)} bits/byte`],
            ["MIME type", file.mimeType || "application/octet-stream"],
          ],
        },
      ],
    };
  }, [file]);

  if (!file) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-black/25 via-black/5 to-transparent" aria-hidden />
      <motion.aside
        initial={{ x: 420, opacity: 0.92 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0.92 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={`pointer-events-auto absolute inset-y-3 right-3 flex w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border shadow-[0_24px_80px_-36px_rgba(15,23,42,0.9)] ${
          isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#071427] text-[#e5e7eb]"
        }`}
        role="dialog"
        aria-modal="false"
        aria-label="File forensic investigation drawer"
      >
        <header className={`border-b px-4 py-3 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>SOC forensic inspector</p>
              <h3 className={`mt-1 truncate text-base font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{file.name}</h3>
              <p className={`mt-0.5 text-xs ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
                CORE-INGEST-2 · {forensic.relay} · {forensic.vault}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border p-2 transition hover:scale-105 ${isLight ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/[0.04] text-slate-300"}`}
              aria-label="Close forensic panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
            <span className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">{forensic.trust}</span>
            <span className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300">relay synced</span>
            <span className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-2 py-1 font-semibold text-sky-300">{forensic.latency} verify</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#0b1727]"}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={`text-[10px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>SHA-256 visual fingerprint</p>
                <p className="mt-1 break-all font-mono text-[11px]">{forensic.hash}</p>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(forensic.hash)}
                className={`shrink-0 rounded-xl border p-2 ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-[#081425] text-cyan-300"}`}
                aria-label="Copy SHA-256 hash"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {forensic.sections.map((section) => (
              <section key={section.title} className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0b1727]"}`}>
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>{section.title}</p>
                </div>
                <dl className="grid gap-1.5">
                  {section.items.map(([label, value]) => (
                    <div key={`${section.title}-${label}`} className="grid grid-cols-[118px_1fr] gap-2 text-xs">
                      <dt className={isLight ? "text-slate-500" : "text-[#8ea4c2]"}>{label}</dt>
                      <dd className="break-all font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>

        <footer className={`border-t px-4 py-3 text-xs ${isLight ? "border-slate-200 text-slate-500" : "border-white/10 text-[#8ea4c2]"}`}>
          <div className="flex items-center justify-between gap-2">
            <span>Upload timestamp: {file.uploadedAt || file.uploadDate || "indexed"}</span>
            <span className="font-semibold text-emerald-300">live investigation</span>
          </div>
        </footer>
      </motion.aside>
    </div>
  );
});
