import { memo } from "react";
import { Search, Copy, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { sanitizePlainText } from "@/utils/sanitize";

function cell(value, maxLen) {
  return sanitizePlainText(value == null ? "" : String(value), maxLen);
}

export default memo(function LogsTable({
  refreshing = false,
  fetchStatus = "ready",
  errorMessage,
  onRetryFetch,
  isEmpty = false,
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
  pagedLogs,
  page,
  pageCount,
  onPrevPage,
  onNextPage,
  sortBy,
  onToggleSort,
  onSelectRow,
  onCopyIp,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      {refreshing && fetchStatus === "ready" ? (
        <p className="-mt-1 mb-3 flex items-center gap-2 text-xs text-[#64748B]">
          <Loader2 className="h-4 w-4 animate-spin text-[#38bdf8]" aria-hidden />
          Operator resync — reconciling streamed events…
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
          <label htmlFor="soc-log-search" className="sr-only">
            Filter security event table
          </label>
          <input
            id="soc-log-search"
            type="search"
            maxLength={200}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search logs (debounced)"
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60"
            autoComplete="off"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2.5 text-sm text-[#E5E7EB]"
          aria-label="Filter by disposition"
        >
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="blocked">Blocked</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-lg border border-white/5">
        <table
          className="w-full min-w-[520px]"
          role="grid"
          aria-busy={fetchStatus === "loading" || refreshing}
        >
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase text-[#9CA3AF]">
              {(["time", "user", "email", "ip", "action", "result"]).map((head) => (
                <th key={head} className="px-3 py-2">
                  <button
                    type="button"
                    className={`text-left hover:text-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded ${
                      sortBy.key === head ? "text-[#93C5FD]" : ""
                    }`}
                    onClick={() => onToggleSort(head)}
                    aria-sort={
                      sortBy.key === head
                        ? sortBy.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {head === "ip" ? "IP Address" : head}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fetchStatus === "loading" ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`sk-${idx}`}>
                  <td colSpan={6} className="px-3 py-3">
                    <div className="flex items-center gap-2 text-xs text-[#64748b]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#38bdf8]" aria-hidden />
                      Pulling audit matrix from northbound API…
                    </div>
                  </td>
                </tr>
              ))
            ) : fetchStatus === "error" ? (
              <tr>
                <td colSpan={6} className="px-3 py-4">
                  <ErrorBanner
                    title="Log fabric unavailable"
                    message={sanitizePlainText(errorMessage ?? "Request failed.", 360)}
                    onRetry={onRetryFetch}
                  />
                </td>
              </tr>
            ) : isEmpty || pagedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-[#9CA3AF]">
                  No telemetry matches posture filters.
                </td>
              </tr>
            ) : (
              pagedLogs.map((row, idx) => (
                <tr
                  key={row.id ?? `${row.ip}-${idx}`}
                  className="cursor-pointer border-b border-white/5 text-sm text-[#E5E7EB] hover:bg-white/5"
                  role="row"
                  onClick={() => onSelectRow(row)}
                >
                  <td className="px-3 py-3 tabular-nums">{cell(row.time, 24)}</td>
                  <td className="px-3 py-3">{cell(row.user, 120)}</td>
                  <td className="px-3 py-3">{cell(row.email, 120)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#9CA3AF]">{cell(row.ip, 45)}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-[#9CA3AF] hover:bg-white/10 hover:text-[#E5E7EB]"
                        aria-label={`Copy IP ${cell(row.ip, 45)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCopyIp(row.ip);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">{cell(row.action, 120)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        String(row.result).toLowerCase() === "success"
                          ? "bg-[#10B981]/20 text-[#6EE7B7]"
                          : "bg-[#EF4444]/20 text-[#FCA5A5]"
                      }`}
                    >
                      {cell(row.result, 32)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#9CA3AF]" aria-live="polite">
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={onPrevPage}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={onNextPage}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
});
