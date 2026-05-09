import { useMemo } from "react";

export function useTelemetryBuffer(events, maxSize = 80) {
  return useMemo(() => {
    const trimmed = Array.isArray(events) ? events.slice(0, maxSize) : [];
    return trimmed.reverse();
  }, [events, maxSize]);
}

