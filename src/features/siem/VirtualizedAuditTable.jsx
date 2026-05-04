import { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Ban, ClipboardList, Copy, Flag, ShieldAlert } from "lucide-react";
import { formatDisplayTimestamp } from "@/utils/auditLogSchema";
import { sanitizePlainText } from "@/utils/sanitize";

export const ROW_HEIGHT = 52;
const OVERSCAN = 6;

const severityClass = (severity) =>
  severity === "Critical"
    ? "bg-[#EF4444]/25 text-[#FCA5A5] ring-1 ring-[#EF4444]/30"
    : severity === "High"
      ? "bg-[#F97316]/20 text-[#FDBA74] ring-1 ring-[#F97316]/25"
      : severity === "Medium"
        ? "bg-[#F59E0B]/20 text-[#FDE68A] ring-1 ring-[#F59E0B]/20"
        : "bg-[#10B981]/20 text-[#86EFAC] ring-1 ring-[#10B981]/20";

const resultClass = (result) =>
  result === "Success"
    ? "bg-[#10B981]/20 text-[#6EE7B7]"
    : result === "Failed"
      ? "bg-[#F59E0B]/20 text-[#FDE68A]"
      : "bg-[#EF4444]/20 text-[#FCA5A5]";

function rowTooltip(log) {
  const parts = [
    `Time: ${formatDisplayTimestamp(log.timestamp)}`,
    `Principal: ${log.user} <${log.email}>`,
    `Source: ${log.ip} · ${log.location}`,
    `Device: ${log.device}`,
    `Action: ${log.action} · ${log.severity} · ${log.result}`,
    log.meta?.sessionId ? `Session: ${log.meta.sessionId}` : null,
  ].filter(Boolean);
  return sanitizePlainText(parts.join("\n"), 900);
}

const AuditTableRow = memo(function AuditTableRow({
  row,
  logicalIndex,
  hi,
  criticalFlash,
  selected,
  correlation,
  isIncident,
  isQueued,
  onSelect,
  onCopyIp,
  onBlockIp,
  onMarkIncident,
  onInvestigate,
  auditGates,
}) {
  const gates = auditGates ?? {};
  const canBlk = auditGates == null ? true : Boolean(gates.canUiBlockIp);
  const canIr = auditGates == null ? true : Boolean(gates.canInvestigateThreat);
  const isStripe = logicalIndex % 2 === 0;
  const title = rowTooltip(row);
  const corr = correlation ?? null;

  return (
    <tr
      title={title}
      style={{ height: ROW_HEIGHT }}
      className={[
        "group cursor-pointer border-t border-white/5 text-sm text-[#E5E7EB] transition-colors duration-200",
        "hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]",
        selected ? "bg-[rgba(30,58,138,0.55)]" : isStripe ? "bg-[rgba(15,23,42,0.55)]" : "bg-[rgba(17,24,39,0.65)]",
        hi ? "ring-1 ring-cyan-400/25" : "",
        criticalFlash ? "siem-critical-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(row)}
    >
      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-xs text-[#93C5FD]">
        {sanitizePlainText(formatDisplayTimestamp(row.timestamp), 42)}
      </td>
      <td className="max-w-[140px] truncate px-3 py-2 align-middle">{sanitizePlainText(row.user, 160)}</td>
      <td className="max-w-[200px] truncate px-3 py-2 align-middle text-[#C7D2FE]">
        {sanitizePlainText(row.email, 254)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-xs text-[#93C5FD]">
        {sanitizePlainText(row.ip, 45)}
      </td>
      <td className="max-w-[120px] truncate px-3 py-2 align-middle">{sanitizePlainText(row.location, 120)}</td>
      <td className="max-w-[140px] truncate px-3 py-2 align-middle text-[#94A3B8]">
        {sanitizePlainText(row.device, 120)}
      </td>
      <td className="max-w-[100px] truncate px-3 py-2 align-middle">{sanitizePlainText(row.action, 80)}</td>
      <td className="px-3 py-2 align-middle">
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${severityClass(row.severity)}`}>
          {sanitizePlainText(row.severity, 24)}
        </span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${resultClass(row.result)}`}>
          {sanitizePlainText(row.result, 32)}
        </span>
      </td>
      <td className="max-w-[120px] px-2 py-2 align-middle">
        <div className="flex flex-wrap gap-1">
          {corr?.suspicion ? (
            <span
              title={sanitizePlainText(
                `Correlation: ${corr.negativeAttempts} negative outcomes from this IP (${corr.relatedInBuffer} rows in buffer)`,
                200,
              )}
              className="inline-flex items-center gap-0.5 rounded border border-[#F97316]/35 bg-[#F97316]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#FDBA74]"
            >
              <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />
              Pattern
            </span>
          ) : (
            <span className="text-[10px] text-[#475569]">—</span>
          )}
          {isIncident ? (
            <span className="rounded border border-[#EF4444]/40 bg-[#EF4444]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#FCA5A5]">
              IR
            </span>
          ) : null}
          {isQueued ? (
            <span className="rounded border border-[#38BDF8]/35 bg-[#38BDF8]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#BAE6FD]">
              Q
            </span>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-2 align-middle">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Copy IP ${sanitizePlainText(row.ip, 45)}`}
            onClick={(e) => {
              e.stopPropagation();
              onCopyIp(row.ip);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#9CA3AF] opacity-80 transition hover:border-[#3B82F6]/35 hover:text-[#BFDBFE] hover:opacity-100"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
          </button>
          <button
            type="button"
            title="Block IP (POST /logs/action + sinkhole)"
            aria-label="Block IP"
            disabled={!canBlk}
            onClick={(e) => {
              e.stopPropagation();
              if (!canBlk) return;
              onBlockIp(row);
            }}
            className="inline-flex rounded-md border border-[#EF4444]/25 p-1.5 text-[#FCA5A5] opacity-90 transition hover:border-[#EF4444]/50 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Mark as incident"
            aria-label="Mark as incident"
            disabled={!canIr}
            onClick={(e) => {
              e.stopPropagation();
              if (!canIr) return;
              onMarkIncident(row);
            }}
            className="inline-flex rounded-md border border-[#F97316]/25 p-1.5 text-[#FDBA74] opacity-90 transition hover:border-[#F97316]/50 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Add to investigation queue"
            aria-label="Add to investigation queue"
            disabled={!canIr}
            onClick={(e) => {
              e.stopPropagation();
              if (!canIr) return;
              onInvestigate(row);
            }}
            className="inline-flex rounded-md border border-[#38BDF8]/25 p-1.5 text-[#BAE6FD] opacity-90 transition hover:border-[#38BDF8]/45 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default memo(function VirtualizedAuditTable({
  rows,
  highlightedIds,
  criticalFlashIds,
  selectedId,
  onRowSelect,
  onCopyIp,
  onBlockIp,
  onMarkIncident,
  onInvestigate,
  auditGates,
  scrollParentRef,
  liveStream,
  correlationById,
  incidentIds,
  investigationQueue,
}) {
  const localRef = useRef(null);
  const ref = scrollParentRef ?? localRef;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(520);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || 520));
    ro.observe(el);
    setViewportH(el.clientHeight || 520);
    return () => ro.disconnect();
  }, [ref]);

  const visible = useMemo(() => {
    const total = rows.length;
    if (!total) return { start: 0, end: 0, topPad: 0, botPad: 0, slice: [] };
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const count = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(total, start + count);
    const topPad = start * ROW_HEIGHT;
    const botPad = (total - end) * ROW_HEIGHT;
    return { start, end, topPad, botPad, slice: rows.slice(start, end) };
  }, [rows, scrollTop, viewportH]);

  const hiSet = highlightedIds instanceof Set ? highlightedIds : new Set();
  const critSet = criticalFlashIds instanceof Set ? criticalFlashIds : new Set();
  const incSet = incidentIds instanceof Set ? incidentIds : new Set();
  const queueSet = useMemo(() => new Set(investigationQueue ?? []), [investigationQueue]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="siem-vscroll max-h-[520px] overflow-auto rounded-lg border border-white/5 bg-[#0B1220]/40"
      role="region"
      aria-label="Audit log virtual viewport"
      data-live-stream={liveStream ? "true" : "false"}
    >
      <table className="w-full min-w-[1320px] border-collapse">
        <thead className="sticky top-0 z-20 bg-[#0F172A] shadow-[0_8px_20px_rgba(2,6,23,0.45)]">
          <tr className="text-left text-[11px] uppercase tracking-wide text-[#9CA3AF]">
            {["Timestamp", "User", "Email", "IP", "Location", "Device", "Action", "Severity", "Result", "Correlation", "Actions"].map(
              (h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {visible.topPad > 0 ? (
            <tr className="pointer-events-none" aria-hidden style={{ height: visible.topPad }}>
              <td colSpan={11} style={{ height: visible.topPad, padding: 0, border: "none" }} />
            </tr>
          ) : null}
          {visible.slice.map((row, i) => {
            const logicalIndex = visible.start + i;
            return (
              <AuditTableRow
                key={row.id}
                row={row}
                logicalIndex={logicalIndex}
                hi={hiSet.has(row.id)}
                criticalFlash={critSet.has(row.id)}
                selected={selectedId === row.id}
                correlation={correlationById?.[row.id]}
                isIncident={incSet.has(row.id)}
                isQueued={queueSet.has(row.id)}
                onSelect={onRowSelect}
                onCopyIp={onCopyIp}
                onBlockIp={onBlockIp}
                onMarkIncident={onMarkIncident}
                onInvestigate={onInvestigate}
                auditGates={auditGates}
              />
            );
          })}
          {visible.botPad > 0 ? (
            <tr className="pointer-events-none" aria-hidden style={{ height: visible.botPad }}>
              <td colSpan={11} style={{ height: visible.botPad, padding: 0, border: "none" }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
});
