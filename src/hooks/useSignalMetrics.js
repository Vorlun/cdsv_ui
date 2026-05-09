import { useMemo } from "react";

export function useSignalMetrics(activityCount, signalSummary, liveActivity) {
  return useMemo(() => {
    const critical = signalSummary?.critical ?? 0;
    const warning = signalSummary?.warning ?? 0;
    const total = liveActivity?.length ?? activityCount ?? 0;
    const secureVerified = Math.max(0, total - critical - warning);
    const delta = Math.max(0, signalSummary?.newEvents ?? 0);
    const suspiciousTraffic = warning + critical;
    const authenticatedSessions = Math.max(8, Math.min(40, 14 + secureVerified));
    const load = Math.min(100, 54 + secureVerified * 3 + suspiciousTraffic * 6);
    const telecomStability = Math.max(88, Math.min(99, 98 - critical * 2 - warning * 0.8));
    const packetConfidence = Math.max(91, Math.min(99.9, 98.8 - suspiciousTraffic * 0.35));
    return {
      volume: total,
      critical,
      warning,
      info: secureVerified,
      secureVerified,
      suspiciousTraffic,
      authenticatedSessions,
      delta,
      load,
      telecomStability,
      packetConfidence: packetConfidence.toFixed(1),
    };
  }, [activityCount, signalSummary, liveActivity]);
}

