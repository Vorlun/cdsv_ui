import { memo } from "react";
import { motion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { sanitizePlainText } from "@/utils/sanitize";

const SEVERITY_CLASS = Object.freeze({
  Low: "bg-[#10B981]/20 text-[#6EE7B7]",
  Medium: "bg-[#F59E0B]/20 text-[#FCD34D]",
  High: "bg-[#EF4444]/20 text-[#FCA5A5]",
  Critical: "bg-[#B91C1C]/30 text-[#FCA5A5]",
});

export default memo(function ThreatFeed({
  fetchStatus = "ready",
  errorMessage,
  onRetryFetch,
  syncing = false,
  items,
  onDismiss,
  soundEnabled,
  onSoundToggle,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#E5E7EB]">Live Threat Monitor</h3>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#9CA3AF]">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => onSoundToggle(e.target.checked)}
            className="rounded border-white/20 bg-[#0F172A]"
          />
          Haptics
        </label>
      </div>
      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1" aria-busy={fetchStatus === "loading" || syncing}>
        {fetchStatus === "loading" ? (
          <div className="flex flex-col gap-3 py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`tf-sk-${String(i)}`}
                className="animate-pulse rounded-xl border border-white/10 bg-[#0F172A] p-4"
              >
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="mt-3 h-4 w-full rounded bg-white/[0.06]" />
                <div className="mt-2 h-4 w-[85%] rounded bg-white/[0.05]" />
              </div>
            ))}
            <p className="flex items-center gap-2 text-xs text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin text-[#38bdf8]" aria-hidden />
              Subscribing to incident rail…
            </p>
          </div>
        ) : fetchStatus === "error" ? (
          <ErrorBanner
            title="Threat rail fault"
            message={sanitizePlainText(errorMessage ?? "Request failed.", 360)}
            onRetry={onRetryFetch}
          />
        ) : (
          <>
            {syncing ? (
              <p className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2 text-xs text-[#64748B]">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#38bdf8]" aria-hidden />
                Merging live SOC pulses…
              </p>
            ) : null}
            {!items?.length ? (
              <EmptyState
                title="No active anomalies"
                description="Telemetry stream is nominal. New incidents will queue here automatically."
              />
            ) : (
              items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-[#0F172A] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${SEVERITY_CLASS[item.severity] ?? "bg-white/10 text-[#E5E7EB]"}`}
                >
                  {sanitizePlainText(item.severity, 32)}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-[#9CA3AF]">{sanitizePlainText(item.ago, 32)}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-[#9CA3AF] hover:bg-white/10 hover:text-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                    onClick={() => onDismiss(item.id)}
                    aria-label={`Acknowledge incident ${sanitizePlainText(item.message, 120)}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.severity === "Critical" ? (
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#EF4444]" aria-hidden />
                ) : null}
                <p className="text-sm leading-relaxed text-[#E5E7EB]">
                  {sanitizePlainText(item.message, 480)}
                </p>
              </div>
            </motion.div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
});
