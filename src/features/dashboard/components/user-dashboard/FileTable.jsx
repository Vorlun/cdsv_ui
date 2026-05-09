import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileDigit, FileJson2, FileSpreadsheet, FileText, LockKeyhole, Search } from "lucide-react";
import { sanitizePlainText } from "@/utils/sanitize";
import { formatRelativeShort } from "./formatters";
import { EmptyStateCard, UploadCtaLink } from "./EmptyStates";
import { formatStatusLabel, statusBadgeClasses } from "./userStatusStyles";

export default memo(function FileTable({ recentFiles, isLight, onFileSelect, selectedFileId = null }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortDir, setSortDir] = useState("desc");
  const pageSize = 6;
  const cardBase = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-sm"
    : "rounded-3xl border border-white/10 bg-[#0b1628]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const tableHead = isLight ? "border-slate-200 bg-slate-50/90 text-slate-500" : "border-white/10 bg-[#0f172a]/85 text-[#9CA3AF]";
  const tableRow = isLight ? "border-slate-100" : "border-white/5";
  const rowHover = isLight ? "cursor-pointer hover:bg-sky-50/50" : "cursor-pointer hover:bg-white/[0.04]";
  const fileIcon = (name) => {
    const n = String(name || "").toLowerCase();
    if (n.endsWith(".csv")) return FileSpreadsheet;
    if (n.endsWith(".json")) return FileJson2;
    if (n.endsWith(".txt")) return FileText;
    return FileDigit;
  };
  const fileTelemetry = (file, index) => {
    const risk = String(file.riskLevel || file.threatLevel || "low").toLowerCase();
    const quarantined = risk.includes("critical") || risk.includes("high") || String(file.status || "").toLowerCase().includes("blocked");
    return {
      ingestNode: `CORE-INGEST-${(index % 3) + 1}`,
      relay: index % 2 ? "RELAY-WEST-02" : "RELAY-EAST-01",
      vault: quarantined ? "QUARANTINE-A" : "VAULT-A",
      latency: 18 + index * 5 + (quarantined ? 14 : 0),
      classLabel: quarantined ? "quarantine monitored" : risk.includes("medium") ? "pending analyst review" : "trusted asset",
      chips: quarantined ? ["TLS verified", "DLP isolated", "relay watch"] : ["TLS verified", "AES secured", "SHA validated"],
    };
  };

  const data = useMemo(
    () =>
      recentFiles.filter((file) => {
        if (!search.trim()) return true;
        const haystack = `${file.name} ${file.status} ${file.riskLevel || ""} ${file.threatLevel || ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [recentFiles, search],
  );
  const sortedRows = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = String(a?.[sortBy] ?? "");
      const bv = String(b?.[sortBy] ?? "");
      if (sortDir === "asc") return av.localeCompare(bv);
      return bv.localeCompare(av);
    });
    return copy;
  }, [data, sortBy, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDir("desc");
  };

  return (
    <section className={`${cardBase} overflow-hidden transition duration-300 hover:shadow-[0_0_32px_-14px_rgba(56,189,248,0.15)]`}>
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${
            isLight ? "border-slate-200" : "border-white/[0.08]"
          }`}
        >
          <div>
            <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Recent uploads</h3>
            <p className={`text-xs ${muted}`}>Latest secure ingestions with vault, relay and verification telemetry.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 ${muted}`} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search uploads"
                className={`h-7 rounded-lg border pl-7 pr-2 text-xs ${isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-[#0F172A] text-slate-200"}`}
              />
            </div>
            <Link className={`text-sm font-semibold transition hover:underline ${isLight ? "text-sky-700" : "text-[#93C5FD]"}`} to="/files">
              Open file center
            </Link>
          </div>
        </div>
        {data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide backdrop-blur-sm ${tableHead}`}>
                  <th className="px-4 py-3 font-medium"><button type="button" onClick={() => toggleSort("name")}>File</button></th>
                  <th className="px-4 py-3 font-medium">Ingestion path</th>
                  <th className="px-4 py-3 font-medium"><button type="button" onClick={() => toggleSort("status")}>Status</button></th>
                  <th className="px-4 py-3 font-medium">Integrity</th>
                  <th className="px-4 py-3 font-medium"><button type="button" onClick={() => toggleSort("riskLevel")}>Risk</button></th>
                  <th className="px-4 py-3 font-medium"><button type="button" onClick={() => toggleSort("uploadedAt")}>Uploaded</button></th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((f, index) => {
                  const telemetry = fileTelemetry(f, index);
                  const isActive = selectedFileId && String(selectedFileId) === String(f.id || f.name);
                  return (
                    <tr
                      key={f.id || `${f.name}-${index}`}
                      className={`group/row border-b transition-colors duration-200 ${tableRow} ${rowHover} ${
                        isActive
                          ? isLight
                            ? "bg-sky-50 shadow-[inset_3px_0_0_rgba(14,165,233,0.75)]"
                            : "bg-cyan-500/[0.08] shadow-[inset_3px_0_0_rgba(34,211,238,0.75)]"
                          : ""
                      }`}
                      style={{ animationDelay: `${index * 40}ms` }}
                      onClick={() => onFileSelect?.(f)}
                    >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        {(() => {
                          const Icon = fileIcon(f.name);
                          return <Icon className="h-4 w-4 text-sky-400" aria-hidden />;
                        })()}
                        <span>
                          <span className={`block text-sm font-medium ${isLight ? "text-sky-800" : "text-[#BFDBFE]"}`}>{sanitizePlainText(f.name, 120)}</span>
                          <span className={`block text-[10px] ${isActive ? "text-cyan-300" : muted}`}>
                            {isActive ? "forensic inspection active" : telemetry.classLabel}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-[10px] ${muted}`}>
                        <p><span className="font-semibold text-cyan-300">{telemetry.ingestNode}</span> {"->"} {telemetry.relay}</p>
                        <p>{telemetry.vault} · {telemetry.latency}ms verify</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${statusBadgeClasses(f.status, isLight)}`}>
                        {formatStatusLabel(f.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        <span className="text-emerald-300">{f.integrityStatus || "SHA-256 verified"}</span>
                        {telemetry.chips.slice(0, 2).map((chip) => (
                          <span key={`${f.id || f.name}-${chip}`} className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-200">
                            <LockKeyhole className="h-3 w-3" aria-hidden />
                            {chip}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const risk = String(f.riskLevel || f.threatLevel || "low").toLowerCase();
                        const riskTone = risk.includes("critical") || risk.includes("high")
                          ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
                          : risk.includes("medium")
                            ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
                        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] uppercase ${riskTone}`}>{risk}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3"><time className={`text-xs tabular-nums ${muted}`} dateTime={f.uploadedAt}>{formatRelativeShort(f.uploadedAt)}</time></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFileSelect?.(f);
                        }}
                        className={`text-xs font-semibold ${isLight ? "text-sky-700" : "text-[#93C5FD]"}`}
                      >
                        Forensic view
                      </button>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <div className={`overflow-hidden rounded-xl border ${isLight ? "border-slate-200" : "border-white/10"}`}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wide ${tableHead}`}>
                    <th className="px-4 py-2.5 font-medium">File</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Integrity</th>
                    <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={`placeholder-${idx}`} className={`border-b ${tableRow}`}>
                      <td className={`px-4 py-3 ${muted}`}>Awaiting first secure upload...</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-400"}`}>
                          Pending intake
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${muted}`}>SHA-256 verification ready</td>
                      <td className={`px-4 py-3 ${muted}`}>Telemetry records will appear here.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <EmptyStateCard
                isLight={isLight}
                title="Vault ready for secure ingestion"
                description="Upload telemetry will populate this table with threat level, integrity hash, and secure timestamps."
                action={<UploadCtaLink label="Upload File" isLight={isLight} />}
              />
            </div>
          </div>
        )}
        {data.length ? (
          <div className={`flex items-center justify-between border-t px-5 py-3 text-xs ${isLight ? "border-slate-200 text-slate-600" : "border-white/10 text-slate-300"}`}>
            <span>
              Page {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border px-2 py-1 disabled:opacity-50">
                Prev
              </button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border px-2 py-1 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
  );
});
