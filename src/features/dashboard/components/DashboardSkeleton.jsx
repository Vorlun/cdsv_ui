import { memo } from "react";

function Bar({ className }) {
  return (
    <div
      role="presentation"
      className={["animate-pulse rounded-lg bg-white/5", className].join(" ")}
    />
  );
}

export default memo(function DashboardSkeleton() {
  return (
    <div className="relative z-10 mx-auto max-w-[1400px] space-y-6" aria-busy aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={`sk-m-${i}`} className="h-28" />
        ))}
      </div>
      <Bar className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Bar className="h-[300px] xl:col-span-2" />
        <Bar className="h-[300px]" />
      </div>
      <Bar className="h-[280px]" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Bar className="h-[360px]" />
        <Bar className="h-[420px] xl:col-span-2" />
      </div>
    </div>
  );
});
