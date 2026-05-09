import { useMemo } from "react";
import { useNodeHealth } from "@/hooks/useNodeHealth";

export function useInfrastructureTelemetry(healthStrip, events) {
  const nodes = useNodeHealth(healthStrip, events);
  return useMemo(() => {
    const avgLatency = nodes.length ? Math.round(nodes.reduce((acc, n) => acc + n.latency, 0) / nodes.length) : 0;
    const avgUptime = nodes.length ? Math.round(nodes.reduce((acc, n) => acc + n.uptime, 0) / nodes.length) : 0;
    return {
      nodes,
      cluster: {
        avgLatency,
        avgUptime,
        syncedNodes: nodes.filter((n) => n.syncHealth >= 90).length,
      },
    };
  }, [nodes]);
}

