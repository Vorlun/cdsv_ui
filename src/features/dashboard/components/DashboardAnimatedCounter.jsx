import { useEffect, useState } from "react";

/** Memoized-heavy numeric reveal for KPI tiles — parent should memo KPI cards separately. */
export function DashboardAnimatedCounter({ value }) {
  const target = typeof value === "number" ? value : Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 650;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const progress = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{display.toLocaleString()}</>;
}
