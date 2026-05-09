import { memo, useMemo } from "react";

function buildPath(series, yMax) {
  if (!series.length) return "";
  const points = series.map((v, i) => ({
    x: (i / (series.length - 1 || 1)) * 100,
    y: 100 - (v / Math.max(1, yMax)) * 100,
  }));
  return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
}

function markerTone(severity) {
  if (severity === "critical") return "rgba(248,113,113,0.95)";
  if (severity === "high") return "rgba(251,146,60,0.95)";
  return "rgba(250,204,21,0.95)";
}

const EMPTY_SERIES = [];
const EMPTY_MARKERS = [];

export default memo(function TelemetryChart({ stream, isLight }) {
  const series = stream?.series ?? EMPTY_SERIES;
  const yMax = stream?.yMax ?? 100;
  const markers = stream?.markers ?? EMPTY_MARKERS;
  const path = useMemo(() => buildPath(series, yMax), [series, yMax]);
  const markerPoints = useMemo(
    () =>
      markers.map((marker, index) => ({
        ...marker,
        x: (marker.idx / Math.max(1, series.length - 1)) * 100,
        y: 18 + ((index * 17 + marker.idx * 7) % 50),
      })),
    [markers, series.length],
  );

  return (
    <div className={`rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white/70" : "border-white/10 bg-[#081425]/85"}`}>
      <div className={`mb-1 flex items-center justify-between text-[10px] ${isLight ? "text-slate-500" : "text-[#8ea4c2]"}`}>
        <span>Y: {yMax}</span>
        <span>Telemetry window: 64 points</span>
      </div>
      <svg viewBox="0 0 100 100" className="h-[152px] w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="telemetryLineSecure" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.75)" />
            <stop offset="100%" stopColor="rgba(14,165,233,1)" />
          </linearGradient>
          <linearGradient id="telemetryAreaSecure" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.02)" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((tick) => (
          <line key={tick} x1="0" x2="100" y1={100 - tick} y2={100 - tick} stroke="rgba(148,163,184,0.15)" strokeWidth="0.5" />
        ))}
        <path d={`${path} L 100,100 L 0,100 Z`} fill="url(#telemetryAreaSecure)" />
        <path d={path} fill="none" stroke="url(#telemetryLineSecure)" strokeWidth="1.7" strokeLinecap="round" />
        {markerPoints.map((marker) => {
          const tone = markerTone(marker.severity);
          return <circle key={marker.id} cx={marker.x} cy={marker.y} r="1.6" fill={tone} style={{ filter: "drop-shadow(0 0 3px rgba(248,113,113,0.35))" }} />;
        })}
      </svg>
      <div className={`mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#7f93ad]"}`}>
        <span>t-60s</span>
        <span>blue normal / yellow suspicious / red threat / green secure</span>
        <span>now</span>
      </div>
    </div>
  );
});

