import { useMemo, useState } from "react";
import { useTelemetryFeed } from "@/hooks/useTelemetryFeed";

export function useTelemetrySocket(maxEvents = 24) {
  const [events, setEvents] = useState([]);

  useTelemetryFeed((payload) => {
    if (!payload) return;
    if (payload._channel && payload._channel !== "event") return;
    setEvents((prev) => {
      const id = String(payload.id ?? "");
      if (id && prev.some((event) => event.id === id)) return prev;
      return [payload, ...prev].slice(0, maxEvents);
    });
  });

  const latest = events[0] ?? null;
  const stats = useMemo(() => {
    const critical = events.filter((e) => e.severity === "critical").length;
    const high = events.filter((e) => e.severity === "high").length;
    const suspicious = events.filter((e) => e.type === "suspicious_request").length;
    return { critical, high, suspicious };
  }, [events]);

  return { events, latest, stats };
}

