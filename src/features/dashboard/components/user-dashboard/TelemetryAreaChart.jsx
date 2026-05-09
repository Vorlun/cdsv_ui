import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default memo(function TelemetryAreaChart({ rows, isLight = false }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const maxY = useMemo(() => {
    const maxVal = rows.reduce(
      (acc, row) =>
        Math.max(
          acc,
          Number(row.uploads || 0),
          Number(row.encrypted || 0),
          Number(row.verified || 0),
          Number(row.scanned || 0),
          Number(row.suspicious || 0),
          Number(row.blocked || 0),
        ),
      0,
    );
    return maxVal <= 0 ? 4 : Math.max(6, Math.ceil(maxVal * 1.35));
  }, [rows]);

  const spikeDots = useMemo(
    () =>
      rows
        .map((row, index) => ({ ...row, index }))
        .filter((row) => Number(row.uploads || 0) > 0 || Number(row.suspicious || 0) > 0 || Number(row.blocked || 0) > 0),
    [rows],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setReady((prev) => {
        const next = rect.width > 0 && rect.height > 0;
        return prev === next ? prev : next;
      });
    };

    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-[300px] min-h-[300px] w-full min-w-0 overflow-hidden">
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="uploadsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.58} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id="encryptedArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="verifiedArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.38} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={isLight ? "#E2E8F0" : "#1F2937"} strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="timestamp" stroke={isLight ? "#64748B" : "#9CA3AF"} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke={isLight ? "#64748B" : "#9CA3AF"}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
            domain={[0, maxY]}
          />
          <Tooltip
            cursor={{ stroke: "rgba(148,163,184,0.28)" }}
            labelFormatter={(v) => `Window ${v}`}
            formatter={(value, key) => [`${Math.max(0, Math.round(Number(value)))} evt`, String(key)]}
            contentStyle={{
              background: isLight ? "#fff" : "#0F172A",
              border: `1px solid ${isLight ? "#CBD5E1" : "#334155"}`,
              borderRadius: "10px",
              fontSize: "11px",
            }}
          />
          <Area
            type="monotone"
            dataKey="uploads"
            name="Uploads"
            stroke="#60a5fa"
            fill="url(#uploadsArea)"
            strokeWidth={2.2}
            isAnimationActive
            animationDuration={380}
            dot={(props) => {
              const value = Number(props?.payload?.uploads || 0);
              if (value <= 0) return null;
              return <circle cx={props.cx} cy={props.cy} r={3.6} fill="#93c5fd" stroke="#1e3a8a" strokeWidth={1} />;
            }}
            activeDot={{ r: 5, stroke: "#1e40af", strokeWidth: 1.2, fill: "#dbeafe" }}
          />
          <Area
            type="monotone"
            dataKey="encrypted"
            name="Encrypted"
            stroke="#22d3ee"
            fill="url(#encryptedArea)"
            strokeWidth={1.9}
            dot={false}
            activeDot={{ r: 4, stroke: "#0e7490", strokeWidth: 1, fill: "#cffafe" }}
          />
          <Area
            type="monotone"
            dataKey="verified"
            name="Verified"
            stroke="#34d399"
            fill="url(#verifiedArea)"
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 4, stroke: "#047857", strokeWidth: 1, fill: "#d1fae5" }}
          />
          <Line
            type="monotone"
            dataKey="scanned"
            name="Scanned"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive
            animationDuration={360}
          />
          <Line
            type="monotone"
            dataKey="suspicious"
            name="Suspicious"
            stroke="#fb7185"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive
            animationDuration={360}
          />
          <Line
            type="monotone"
            dataKey="blocked"
            name="Quarantine"
            stroke="#f43f5e"
            strokeWidth={1.7}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive
            animationDuration={360}
          />
          {spikeDots.map((row) => (
            <ReferenceDot
              key={`${row.timestamp}-${row.index}`}
              x={row.timestamp}
              y={Math.max(Number(row.uploads || 0), Number(row.suspicious || 0), Number(row.blocked || 0))}
              r={3}
              fill={Number(row.blocked || 0) > 0 ? "#f43f5e" : Number(row.suspicious || 0) > 0 ? "#fb923c" : "#38bdf8"}
              stroke="transparent"
            />
          ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className={isLight ? "h-full w-full rounded-2xl bg-slate-50" : "h-full w-full rounded-2xl bg-[#0F172A]"} />
      )}
    </div>
  );
});
