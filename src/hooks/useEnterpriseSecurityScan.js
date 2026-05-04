import { useCallback, useEffect, useRef, useState } from "react";

/**
 * OSS-style progressive scan runner with deterministic interval teardown.
 */
export function useEnterpriseSecurityScan(scanStages) {
  const timerRef = useRef(null);

  const [scanState, setScanState] = useState({
    running: false,
    progress: 0,
    result: "",
    stage: "",
    mediumAlerts: 0,
    blockedToday: 0,
    threatDetected: false,
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const run = useCallback(
    (correlation) => {
      clearTimer();
      const threatDetected =
        typeof correlation?.threatDetected === "boolean"
          ? correlation.threatDetected
          : Math.random() > 0.65;
      const mediumFinal =
        typeof correlation?.mediumAlerts === "number"
          ? correlation.mediumAlerts
          : threatDetected
            ? 4
            : 2;
      const blockedFinal =
        typeof correlation?.blockedToday === "number"
          ? correlation.blockedToday
          : threatDetected
            ? 22
            : 14;
      const stages = scanStages ?? [];
      setScanState({
        running: true,
        progress: 0,
        result: "",
        stage: stages[0] ?? "",
        mediumAlerts: 0,
        blockedToday: 0,
        threatDetected,
        mediumFinal,
        blockedFinal,
      });

      timerRef.current = window.setInterval(() => {
        setScanState((prev) => {
          const nextProgress = prev.progress + 8;
          const len = stages.length || 1;
          const idx = Math.min(len - 1, Math.floor((nextProgress / 100) * len));
          const stageLabel = stages[idx] ?? "";

          if (nextProgress >= 100) {
            clearTimer();
            return {
              running: false,
              progress: 100,
              stage: stages[len - 1] ?? "",
              result: prev.threatDetected
                ? "Medium severity anomalies detected"
                : "No critical threats found",
              mediumAlerts: prev.mediumFinal ?? mediumFinal,
              blockedToday: prev.blockedFinal ?? blockedFinal,
              threatDetected: prev.threatDetected,
            };
          }

          return { ...prev, progress: nextProgress, stage: stageLabel };
        });
      }, 240);
    },
    [scanStages, clearTimer],
  );

  return { scanState, run };
}
