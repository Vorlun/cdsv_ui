import { memo } from "react";

export default memo(function UserDashboardSkeleton({ isLight }) {
  const bone = isLight ? "bg-slate-200/80" : "bg-white/[0.08]";
  const border = isLight ? "border-slate-200" : "border-white/10";

  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className={`h-8 w-48 animate-pulse rounded-lg ${bone}`} />
          <div className={`h-4 w-72 animate-pulse rounded-md ${bone}`} />
        </div>
        <div className={`h-10 w-28 animate-pulse rounded-xl ${bone}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`sk-card-${i}`}
            className={`h-28 animate-pulse rounded-2xl border ${border} ${bone} ${isLight ? "opacity-90" : ""}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <div className={`h-[240px] animate-pulse rounded-2xl border ${border} ${bone}`} />
          <div className={`rounded-2xl border ${border} p-5`}>
            <div className={`mb-4 h-4 w-40 animate-pulse rounded ${bone}`} />
            <div className={`mb-3 h-16 animate-pulse rounded-xl ${bone}`} />
            <div className={`mb-3 h-16 animate-pulse rounded-xl ${bone}`} />
            <div className={`h-16 animate-pulse rounded-xl ${bone}`} />
          </div>
        </div>
        <div className="space-y-6 xl:col-span-2">
          <div className={`h-52 animate-pulse rounded-2xl border ${border} ${bone}`} />
          <div className={`h-56 animate-pulse rounded-2xl border ${border} ${bone}`} />
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border ${border}`}>
        <div className={`border-b px-5 py-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div className={`h-4 w-36 animate-pulse rounded ${bone}`} />
          <div className={`mt-2 h-3 w-64 animate-pulse rounded ${bone}`} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-tr-${i}`} className={`flex gap-4 border-b px-5 py-3 ${isLight ? "border-slate-100" : "border-white/5"}`}>
            <div className={`h-4 flex-1 animate-pulse rounded ${bone}`} />
            <div className={`h-4 w-20 animate-pulse rounded ${bone}`} />
            <div className={`h-4 w-16 animate-pulse rounded ${bone}`} />
            <div className={`h-4 w-24 animate-pulse rounded ${bone}`} />
          </div>
        ))}
      </div>
    </div>
  );
});
