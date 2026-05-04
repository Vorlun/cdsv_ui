import { useEffect, useRef } from "react";

/**
 * Single-interval SOC telemetry ticker — avoids duplicate timers and leaked intervals.
 * @param {(iteration: number) => void} onTick
 * @param {{ intervalMs?: number, enabled?: boolean }} [options]
 */
export function useSocRealtime(onTick, options = {}) {
  const { intervalMs = 5500, enabled = true } = options;
  const cbRef = useRef(onTick);

  cbRef.current = onTick;

  useEffect(() => {
    if (!enabled) return undefined;
    let iteration = 0;
    const id = window.setInterval(() => {
      iteration += 1;
      cbRef.current(iteration);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}
