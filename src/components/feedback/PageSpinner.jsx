import { Loader2 } from "lucide-react";

/**
 * @param {{ label?: string, className?: string }} props
 */
export function PageSpinner({ label = "Loading", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-[#94A3B8] ${className}`}
      role="progressbar"
      aria-busy="true"
      aria-label={label}
    >
      <Loader2 className="h-8 w-8 animate-spin text-[#38BDF8]" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
