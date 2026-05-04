import { memo } from "react";

export default memo(function DashboardOperationalStrip({
  chartRange,
  onChartRangeChange,
  activeSessions,
  healthScore,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="text-xs text-[#9CA3AF]">
          Active Sessions:{" "}
          <span className="font-semibold tabular-nums text-[#E5E7EB]">{activeSessions}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F172A] p-3">
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onChartRangeChange(range)}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide ${
                  chartRange === range
                    ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                    : "bg-[#111827] text-[#9CA3AF] hover:text-[#E5E7EB]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10">
                <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#1F2937" strokeWidth="3" />
                <path
                  d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeDasharray={`${healthScore ?? 92}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#A7F3D0]">
                {healthScore ?? 92}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Security Health Score</p>
              <p className="text-sm font-semibold text-[#E5E7EB]">{healthScore ?? 92}/100</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
