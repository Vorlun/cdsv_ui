import { memo } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export default memo(function QuickActions({
  onBlockIp,
  onExportLogsModal,
  onForceLogoutModal,
  onScanModal,
  onRefreshModal,
  loading,
  blockIpDisabled = false,
  exportLogsDisabled = false,
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          disabled={blockIpDisabled}
          title={blockIpDisabled ? "SOC persona lacks sinkhole entitlement" : undefined}
          onClick={() => !blockIpDisabled && onBlockIp?.()}
          className="rounded-xl bg-[#7F1D1D] px-4 py-2.5 text-sm font-medium text-[#FCA5A5] transition duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Block IP
        </button>
        <button
          type="button"
          disabled={exportLogsDisabled}
          title={exportLogsDisabled ? "Log export denied by governance matrix" : undefined}
          onClick={() => !exportLogsDisabled && onExportLogsModal?.()}
          className="rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-[#BFDBFE] transition duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export Logs
        </button>
        <button
          type="button"
          onClick={onForceLogoutModal}
          className="rounded-xl bg-[#312E81] px-4 py-2.5 text-sm font-medium text-[#C4B5FD] transition duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]"
        >
          Force Logout User
        </button>
        <button
          type="button"
          onClick={onScanModal}
          className="rounded-xl bg-[#064E3B] px-4 py-2.5 text-sm font-medium text-[#6EE7B7] transition duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]"
        >
          Security Scan
        </button>
        <button
          type="button"
          onClick={onRefreshModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F2937] px-4 py-2.5 text-sm font-medium text-[#E5E7EB] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cbd5f5]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Refresh Data
        </button>
      </div>
    </section>
  );
});
