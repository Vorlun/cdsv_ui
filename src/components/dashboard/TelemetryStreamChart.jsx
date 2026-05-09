import { memo, useMemo, useState } from "react";

function buildPath(series, yMax) {
  if (!series.length) return "";
  const points = series.map((v, i) => ({
    x: (i / (series.length - 1 || 1)) * 100,
    y: 100 - (v / Math.max(1, yMax)) * 100,
  }));
  return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
}

const severityColor = {
  critical: "rgba(248,113,113,0.95)",
  high: "rgba(251,146,60,0.95)",
  medium: "rgba(250,204,21,0.95)",
};

const EMPTY_SERIES = [];
const EMPTY_MARKERS = [];

export default memo(function TelemetryStreamChart({ stream, isLight, latestEvent }) {
  const [hover, setHover] = useState(null);
  const series = stream?.series ?? EMPTY_SERIES;
  const yMax = stream?.yMax ?? 100;
  const markers = stream?.markers ?? EMPTY_MARKERS;
  const path = useMemo(() => buildPath(series, yMax), [series, yMax]);
  const markerPoints = useMemo(
    () =>
      markers.map((marker, index) => ({
        ...marker,
        x: (marker.idx / Math.max(1, series.length - 1)) * 100,
        y: 18 + ((index * 19 + marker.idx * 5) % 52),
      })),
    [markers, series.length],
  );

  return (
    <div className={`relative rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white/70" : "border-white/10 bg-[#081425]/85"}`}>
      <div className={`mb-1 flex items-center justify-between text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
        <span>Assurance index: {yMax}</span>
        <span>64-sample encrypted traffic window</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        className="h-[156px] w-full"
        preserveAspectRatio="none"
        aria-hidden
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const pct = (event.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(series.length - 1, Math.round(pct * (series.length - 1))));
          setHover({ idx, x: pct * 100, value: series[idx] });
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="telemetryLineEnterprise" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.72)" />
            <stop offset="100%" stopColor="rgba(14,165,233,1)" />
          </linearGradient>
          <linearGradient id="telemetryAreaEnterprise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.01)" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((tick) => (
          <line key={tick} x1="0" x2="100" y1={100 - tick} y2={100 - tick} stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />
        ))}
        <path d={`${path} L 100,100 L 0,100 Z`} fill="url(#telemetryAreaEnterprise)" />
        <path d={path} fill="none" stroke="url(#telemetryLineEnterprise)" strokeWidth="1.7" strokeLinecap="round" />
        {markerPoints.map((marker) => {
          return (
            <circle
              key={marker.id}
              cx={marker.x}
              cy={marker.y}
              r="1.5"
              fill={severityColor[marker.severity] ?? "rgba(148,163,184,0.9)"}
              style={{ filter: "drop-shadow(0 0 2px rgba(248,113,113,0.32))" }}
            />
          );
        })}
        {hover ? <line x1={hover.x} x2={hover.x} y1="0" y2="100" stroke="rgba(148,163,184,0.3)" strokeDasharray="1.4 1.4" /> : null}
      </svg>
      <div className={`mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>
        <span>{new Date(Date.now() - 60_000).toLocaleTimeString("en-GB", { hour12: false })}</span>
        <span>TLS relay baseline / anomaly markers / packet integrity trend</span>
        <span>{new Date().toLocaleTimeString("en-GB", { hour12: false })}</span>
      </div>
      {hover ? (
        <div className={`pointer-events-none absolute right-3 top-8 rounded-lg border px-2 py-1 text-[11px] ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-[#0b1c33] text-[#d0dbea]"}`}>
          <p>assurance: {hover.value}</p>
          <p>sample: {hover.idx}</p>
          {latestEvent ? <p>latest: {latestEvent.message ?? latestEvent.type}</p> : null}
        </div>
      ) : null}
    </div>
  );
});

