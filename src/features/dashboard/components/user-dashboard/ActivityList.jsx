import { memo, useMemo, useState } from "react";
import { Activity as ActivityIcon, Download, LogIn, RefreshCw, ScanLine, Search, Upload } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { EmptyStateCard, UploadCtaLink } from "./EmptyStates";
import SIEMEventCard from "./SIEMEventCard";

const ACTIVITY_META = {
  upload: { label: "Upload", Icon: Upload, iconToneLight: "text-sky-600", iconToneDark: "text-sky-400" },
  encryption: { label: "Encryption", Icon: RefreshCw, iconToneLight: "text-cyan-700", iconToneDark: "text-cyan-300" },
  integrity: { label: "Integrity verify", Icon: ScanLine, iconToneLight: "text-emerald-700", iconToneDark: "text-emerald-300" },
  scan: { label: "Malware scan", Icon: ScanLine, iconToneLight: "text-emerald-600", iconToneDark: "text-emerald-400" },
  anomaly: { label: "API anomaly", Icon: ActivityIcon, iconToneLight: "text-orange-700", iconToneDark: "text-orange-300" },
  session: { label: "Secure session", Icon: LogIn, iconToneLight: "text-indigo-700", iconToneDark: "text-indigo-300" },
  telemetry: { label: "Telemetry sync", Icon: ActivityIcon, iconToneLight: "text-slate-700", iconToneDark: "text-slate-300" },
  download: { label: "Download", Icon: Download, iconToneLight: "text-violet-600", iconToneDark: "text-violet-300" },
  review: { label: "Pending review", Icon: RefreshCw, iconToneLight: "text-amber-600", iconToneDark: "text-amber-400" },
  login: { label: "Console login", Icon: LogIn, iconToneLight: "text-slate-600", iconToneDark: "text-slate-400" },
};

function buildTelemetryTags(row) {
  const tags = [];
  const type = String(row.type || row.category || "").toLowerCase();
  if (type.includes("upload")) tags.push("upload-pipeline");
  if (type.includes("encryption")) tags.push("aes-256");
  if (type.includes("integrity")) tags.push("sha-256");
  if (type.includes("malware")) tags.push("malware-scan");
  if (type.includes("auth")) tags.push("gateway-validation");
  if (!tags.length) tags.push("telemetry-sync");
  return tags;
}

function enrichTimelineRow(row, index) {
  const type = String(row.type || row.category || "").toLowerCase();
  const chain =
    type.includes("upload") ? "upload -> integrity scan -> vault sync" :
      type.includes("integrity") ? "ingest -> sha validation -> archive" :
        type.includes("scan") || type.includes("malware") ? "scan cycle -> verdict -> quarantine gate" :
          type.includes("anomaly") ? "edge signal -> SIEM correlation -> analyst review" :
            type.includes("session") || type.includes("auth") ? "gateway auth -> zero-trust validation" :
              "relay heartbeat -> topology sync";
  return {
    ...row,
    node: row.node || (type.includes("upload") ? "CORE-INGEST-2" : type.includes("anomaly") ? "FTTH-EDGE-11" : "SOC-EAST"),
    cluster: row.cluster || (type.includes("upload") ? "VAULT-A" : "CORE-RELAY"),
    pipeline: row.pipeline || chain,
    relaySource: row.relaySource || (index % 2 ? "RELAY-WEST-02" : "RELAY-EAST-01"),
    trustZone: row.trustZone || `TRUST-ZONE-${(index % 3) + 1}`,
    packetRoute: row.packetRoute || (type.includes("upload") ? "EDGE-UPLINK -> API-GW -> VAULT-A" : "FTTH-EDGE -> SOC-EAST"),
    validationLatencyMs: row.validationLatencyMs || 18 + index * 4,
  };
}

export default memo(function ActivityList({ rows, isLight, onEventSelect }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const cardBase = isLight
    ? "rounded-3xl border border-slate-200 bg-white shadow-sm"
    : "rounded-3xl border border-white/10 bg-[#0b1628]";
  const muted = isLight ? "text-slate-500" : "text-[#9CA3AF]";
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const severityOk = severity === "all" || String(row.severity || "").toLowerCase() === severity;
      const searchOk = !search.trim() || `${row.file || ""} ${row.description || ""} ${row.source || ""} ${row.category || ""} ${(row.tags || []).join(" ")}`.toLowerCase().includes(search.toLowerCase());
      return severityOk && searchOk;
    });
  }, [rows, search, severity]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section
      id="recent-activity"
      className={`${cardBase} p-4 transition duration-300`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? "text-slate-900" : "text-[#E5E7EB]"}`}>Recent Activity SIEM Timeline</h3>
          <p className={`text-xs ${muted}`}>Correlated upload, relay, vault and anomaly event stream.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`relative ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search events"
              className={`h-8 rounded-lg border pl-7 pr-2 text-xs ${
                isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#0F172A]"
              }`}
            />
          </div>
          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
            className={`h-8 rounded-lg border px-2 text-xs ${
              isLight ? "border-slate-200 bg-white text-slate-700" : "border-white/15 bg-[#0F172A] text-slate-200"
            }`}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <ActivityIcon className={`h-5 w-5 ${muted}`} aria-hidden />
        </div>
      </div>
      {pagedRows.length ? (
        <ul className="space-y-1.5 border-l border-sky-500/20 pl-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {pagedRows.map((row, index) => {
              const meta = ACTIVITY_META[row.type] ?? ACTIVITY_META.upload;
              const tone = isLight ? meta.iconToneLight : meta.iconToneDark;
              const enriched = {
                ...enrichTimelineRow(row, index),
                tags: row.tags || buildTelemetryTags(row),
              };

              return (
                <SIEMEventCard
                  key={row.id}
                  row={enriched}
                  meta={meta}
                  tone={tone}
                  muted={muted}
                  isLight={isLight}
                  isExpanded={expandedId === row.id}
                  isLatest={index === 0}
                  onToggle={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                  onInspect={() => onEventSelect?.(enriched)}
                />
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyStateCard
          isLight={isLight}
          title="No audit events recorded yet"
          description="Threat pipeline is armed and awaiting intake. Upload telemetry will appear after first secure ingestion."
          action={<UploadCtaLink label="Upload File" isLight={isLight} />}
        />
      )}
      <div className="mt-3 flex items-center justify-between">
        <p className={`text-xs ${muted}`}>SOC-EAST · Total events: {filteredRows.length} · live correlation active</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`rounded-md border px-2 py-1 text-xs disabled:opacity-40 ${
              isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#0F172A]"
            }`}
          >
            Prev
          </button>
          <span className={`text-xs ${muted}`}>{page}/{totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`rounded-md border px-2 py-1 text-xs disabled:opacity-40 ${
              isLight ? "border-slate-200 bg-white" : "border-white/15 bg-[#0F172A]"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
});
