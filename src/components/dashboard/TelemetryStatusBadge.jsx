import { memo } from "react";

export default memo(function TelemetryStatusBadge({ status = "stable" }) {
  const tone =
    status === "elevated"
      ? "border-amber-400/35 bg-amber-500/12 text-amber-300"
      : "border-emerald-400/35 bg-emerald-500/12 text-emerald-300";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-current" />
      Telemetry {status}
    </span>
  );
});

