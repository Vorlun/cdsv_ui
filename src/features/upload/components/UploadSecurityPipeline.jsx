import { memo, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  { label: "Uploading…", key: "upload" },
  { label: "Encrypting file (AES-256)", key: "encrypt" },
  { label: "Malware scanning…", key: "malware" },
  { label: "Risk analysis…", key: "risk" },
  { label: "Stored securely", key: "stored" },
];

export default memo(function UploadSecurityPipeline({ pipelineDone, phase, isLight }) {
  const muted = isLight ? "text-slate-500" : "text-[#94a3b8]";

  const activeIndex = useMemo(() => {
    if (phase === "uploading") return 0;
    if (phase === "processing" && pipelineDone < 5) return pipelineDone;
    return -1;
  }, [phase, pipelineDone]);

  return (
    <div className="mt-6">
      <p className={`mb-3 text-[11px] font-bold uppercase tracking-wider ${muted}`}>SOC security pipeline</p>
      <ol className="space-y-0">
        {STEPS.map((step, idx) => {
          const completed = idx < pipelineDone;
          const isCurrent = activeIndex === idx;

          return (
            <li key={step.key}>
              <div className="flex gap-3 py-2.5">
                <div className="relative mt-0.5 flex w-6 shrink-0 flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
                    {completed ? (
                      <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </motion.span>
                    ) : isCurrent ? (
                      <Loader2 className={`h-5 w-5 animate-spin ${isLight ? "text-sky-600" : "text-sky-400"}`} />
                    ) : (
                      <span className={`h-2 w-2 rounded-full ${isLight ? "bg-slate-300" : "bg-white/20"}`} />
                    )}
                  </span>
                  {idx < STEPS.length - 1 ? (
                    <span
                      className={`absolute top-8 w-px ${completed ? "bg-emerald-500/45" : isLight ? "bg-slate-200" : "bg-white/10"}`}
                      style={{ height: "calc(100% + 0.25rem)" }}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${step.key}-${completed ? "done" : isCurrent ? "run" : "wait"}`}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`text-sm font-medium leading-snug ${
                        completed
                          ? isLight
                            ? "text-emerald-800"
                            : "text-emerald-200"
                          : isCurrent
                            ? isLight
                              ? "text-sky-800"
                              : "text-sky-200"
                            : muted
                      }`}
                    >
                      [{idx + 1}] {step.label}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
});
