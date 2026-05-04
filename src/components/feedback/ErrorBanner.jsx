import { AlertTriangle } from "lucide-react";

/**
 * @param {{ title?: string, message: string, onRetry?: () => void }} props
 */
export function ErrorBanner({ title = "Something went wrong", message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-[#F97316]/40 bg-[#1c1917]/90 p-5 text-[#fcd9bd]"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#fb923c]" aria-hidden />
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-[#fed7aa]">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
