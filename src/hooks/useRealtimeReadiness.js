import { useMemo } from "react";

export function useRealtimeReadiness(healthMetrics, verificationStatus) {
  return useMemo(() => {
    const avgHealth = healthMetrics.length
      ? Math.round(healthMetrics.reduce((acc, m) => acc + m.value, 0) / healthMetrics.length)
      : 0;
    const checklistPass = verificationStatus.checks.filter((c) => c.verified).length;
    const readinessScore = Math.round(avgHealth * 0.7 + (checklistPass / Math.max(1, verificationStatus.checks.length)) * 30);
    return {
      readinessScore: Math.max(40, Math.min(100, readinessScore)),
      state: readinessScore >= 85 ? "ready" : readinessScore >= 70 ? "monitoring" : "degraded",
    };
  }, [healthMetrics, verificationStatus]);
}

