import { memo } from "react";
import { BellDot, ShieldAlert, Siren, TriangleAlert } from "lucide-react";

function Badge({ label, value, tone, Icon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {value} {label}
    </span>
  );
}

export default memo(function SeverityIndicators({ metrics, suspicious = 0 }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge label="critical threats" value={metrics.critical} tone="border-rose-400/30 bg-rose-500/10 text-rose-300" Icon={ShieldAlert} />
      <Badge label="suspicious traffic" value={metrics.warning} tone="border-amber-400/30 bg-amber-500/10 text-amber-300" Icon={TriangleAlert} />
      <Badge label="verified secure events" value={metrics.secureVerified} tone="border-sky-400/30 bg-sky-500/10 text-sky-300" Icon={BellDot} />
      <Badge label="isolated anomalies" value={suspicious} tone="border-yellow-400/30 bg-yellow-500/10 text-yellow-300" Icon={Siren} />
    </div>
  );
});

