import { useEffect, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function baseFromEvent(event) {
  const packetLoad = Number(event?.metadata?.packetRate ?? event?.metadata?.packetLoad ?? 380);
  const failedAuth = Number(event?.metadata?.failedAuthAttempts ?? 0);
  const suspicious = Number(event?.metadata?.suspiciousEvents ?? 0);
  const tunnelHealth = Number(event?.metadata?.secureTunnelHealth ?? 96);
  const integrity = Number(event?.metadata?.packetIntegrityScore ?? 98);
  const severityBoost =
    event?.severity === "critical" ? 26 : event?.severity === "high" ? 18 : event?.severity === "medium" ? 10 : 0;
  return clamp(62 + packetLoad / 80 + failedAuth * 0.7 + suspicious * 1.1 + severityBoost - (tunnelHealth - 92) * 0.35 - (integrity - 96) * 0.25, 42, 96);
}

export function useRealtimeChart({ length = 64, fps = 18, events = [] } = {}) {
  const [series, setSeries] = useState(() => Array.from({ length }, (_, i) => 26 + (i % 7)));
  const [markers, setMarkers] = useState([]);
  const frameRef = useRef(0);
  const lastTickRef = useRef(0);
  const eventIdxRef = useRef(0);
  const eventsRef = useRef(events);
  const latestMarkerIdRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const minFrameDelta = 1000 / fps;
    let active = true;
    const loop = (ts) => {
      if (!active) return;
      if (!lastTickRef.current) lastTickRef.current = ts;
      const dt = ts - lastTickRef.current;
      if (dt >= minFrameDelta) {
        lastTickRef.current = ts;
        setSeries((prev) => {
          const next = prev.slice(1);
          const currentEvents = eventsRef.current;
          const currentEvent = currentEvents[eventIdxRef.current % Math.max(1, currentEvents.length)];
          tickRef.current += 1;
          const eventBase = baseFromEvent(currentEvent);
          const cycle = Math.sin(tickRef.current / 8) * 2.4;
          const transportWave = Math.sin(tickRef.current / 21) * 3.2;
          const inspectionDrift = Math.cos(tickRef.current / 13) * 1.6;
          const slope = (next[next.length - 1] - next[Math.max(0, next.length - 3)]) * 0.18;
          const scheduledAnomaly = tickRef.current % 97 === 0 ? 11 : tickRef.current % 149 === 0 ? 16 : 0;
          const threatSpike = currentEvent?.severity === "critical" ? 18 : currentEvent?.severity === "high" ? 12 : 0;
          const value = clamp(eventBase + cycle + transportWave + inspectionDrift + slope + scheduledAnomaly + threatSpike, 36, 99);
          next.push(Math.round(value));
          eventIdxRef.current += 1;
          return next;
        });
      }
      frameRef.current = window.requestAnimationFrame(loop);
    };
    frameRef.current = window.requestAnimationFrame(loop);
    return () => {
      active = false;
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [fps]);

  useEffect(() => {
    const latest = events[0];
    if (!latest) return;
    if (latest.severity !== "critical" && latest.severity !== "high" && latest.severity !== "medium") return;
    const markerId = latest.id ?? `${latest.type}-${latest.createdAt}`;
    if (latestMarkerIdRef.current === markerId) return;
    latestMarkerIdRef.current = markerId;
    setMarkers((prev) => [
      {
        id: markerId,
        idx: length - 1,
        severity: latest.severity,
      },
      ...prev.map((m) => ({ ...m, idx: m.idx - 1 })).filter((m) => m.idx > 0),
    ].slice(0, 10));
  }, [events, length]);

  return useMemo(() => {
    const yMax = Math.max(100, Math.ceil(Math.max(...series, 0) / 10) * 10);
    return { series, markers, yMax };
  }, [series, markers]);
}

