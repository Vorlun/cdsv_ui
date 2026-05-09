import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Brain,
  ChevronRight,
  Download,
  FileSearch,
  GitBranch,
  Loader2,
  Lock,
  Network,
  PackageOpen,
  Radiation,
  RefreshCw,
  ShieldAlert,
  ShieldBan,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import {
  formatBytes,
  formatDate,
  scanBadgeClasses,
  threatBadgeClasses,
  truncate,
} from "@/features/admin-upload-monitoring/uploadMonitoringUtils";

function blobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseFilenameFromCd(cd, fallback) {
  if (!cd) return fallback;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(cd);
  const raw = decodeURIComponent((m?.[1] || m?.[2] || m?.[3] || "").trim());
  return raw || fallback;
}

function KeyVal({ label, value, mono }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xs text-slate-100 ${mono ? "break-all font-mono" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

function SectionTitle({ Icon, children }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 border-b border-white/10 pb-2">
      {Icon ? <Icon className="h-4 w-4 text-cyan-400/90" aria-hidden /> : null}
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{children}</h4>
    </div>
  );
}

function JsonOrText({ value }) {
  if (value == null || value === "") return <span className="text-slate-500">—</span>;
  if (typeof value === "object") {
    return (
      <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="break-all font-mono text-[11px] text-slate-200">{String(value)}</span>;
}

const TABS = [
  { id: "overview", label: "Overview", Icon: PackageOpen },
  { id: "security", label: "Security", Icon: ShieldAlert },
  { id: "forensics", label: "Forensics", Icon: Network },
  { id: "ai", label: "AI", Icon: Brain },
  { id: "timeline", label: "Timeline", Icon: Timer },
];

export default memo(function UploadForensicDrawer({
  fileId,
  initialTab = "overview",
  open,
  onClose,
  listRowSnapshot,
  onMutated,
}) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, fileId]);

  const loadAll = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const [d, tl, an] = await Promise.all([
        socApi.uploadForensicDetail(fileId),
        socApi.uploadTimeline(fileId),
        socApi.uploadAnalysis(fileId),
      ]);
      setDetail(d);
      setTimeline(tl);
      setAnalysis(an);
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (open && fileId) void loadAll();
  }, [open, fileId, loadAll]);

  const general = detail?.general;
  const security = detail?.security;
  const forensics = detail?.forensics;
  const ai = detail?.ai;
  const events = useMemo(() => {
    const ev = timeline?.events;
    return Array.isArray(ev) ? ev : [];
  }, [timeline]);

  const titleName = general?.filename ?? listRowSnapshot?.name ?? "Investigation";

  const handleDownload = async () => {
    setActionBusy("download");
    try {
      const { blob, contentDisposition } = await socApi.uploadDownloadBlob(fileId);
      const name = parseFilenameFromCd(contentDisposition, `${fileId}_forensic.bin`);
      blobDownload(blob, name);
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleExport = async () => {
    setActionBusy("export");
    try {
      const bundle = await socApi.uploadExportReport(fileId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      blobDownload(blob, `upload_${fileId}_forensic_report.json`);
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleRescan = async () => {
    setActionBusy("rescan");
    try {
      await socApi.uploadRescan(fileId);
      await loadAll();
      onMutated?.();
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleQuarantine = async () => {
    const reason = window.prompt("Quarantine reason (optional)") ?? "";
    setActionBusy("quarantine");
    try {
      await socApi.uploadQuarantine(fileId, reason.trim() ? { reason: reason.trim() } : undefined);
      await loadAll();
      onMutated?.();
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete vault artifact and index row?")) return;
    setActionBusy("delete");
    try {
      await socApi.uploadDelete(fileId);
      onMutated?.();
      onClose?.();
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setActionBusy(null);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close investigation panel"
            className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-forensic-title"
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[min(100vw-1rem,560px)] flex-col border-l border-cyan-500/15 bg-gradient-to-b from-[#070c14] via-[#0a101c] to-[#07090f] shadow-[0_0_40px_rgba(34,211,238,0.06)]"
            initial={{ x: "104%" }}
            animate={{ x: 0 }}
            exit={{ x: "104%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/70">
                  Forensic investigation
                </p>
                <h2 id="upload-forensic-title" className="truncate font-mono text-sm font-semibold text-white">
                  {truncate(titleName, 52)}
                </h2>
                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{fileId}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/10 px-3 py-2">
              <button
                type="button"
                disabled={actionBusy === "download"}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {actionBusy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download
              </button>
              <button
                type="button"
                disabled={actionBusy === "export"}
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {actionBusy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
                Export
              </button>
              <button
                type="button"
                disabled={actionBusy === "rescan"}
                onClick={handleRescan}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-medium text-sky-100 transition hover:bg-sky-500/15 disabled:opacity-50"
              >
                {actionBusy === "rescan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Re-scan
              </button>
              <button
                type="button"
                disabled={actionBusy === "quarantine"}
                onClick={handleQuarantine}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:opacity-50"
              >
                {actionBusy === "quarantine" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldBan className="h-3.5 w-3.5" />}
                Quarantine
              </button>
              <button
                type="button"
                disabled={actionBusy === "delete"}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 transition hover:bg-rose-500/15 disabled:opacity-50"
              >
                {actionBusy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-slate-400 hover:bg-white/[0.05]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </button>
            </div>

            <div className="flex shrink-0 gap-0.5 overflow-x-auto px-2 py-2 scrollbar-thin">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    tab === id
                      ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-500/30"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" />
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">
              {error ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
              ) : null}

              {loading && !detail ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-400/80" />
                  <span className="text-xs">Hydrating forensic bundle…</span>
                </div>
              ) : null}

              {detail && tab === "overview" ? (
                <div className="space-y-1">
                  <SectionTitle Icon={PackageOpen}>General</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <KeyVal label="Filename" value={general?.filename} mono />
                    <KeyVal label="Extension" value={general?.extension} mono />
                    <KeyVal label="Size" value={formatBytes(general?.size)} />
                    <KeyVal label="MIME" value={general?.mimeType} mono />
                    <KeyVal label="Owner" value={general?.owner?.fullName ?? general?.owner?.email} />
                    <KeyVal label="Owner email" value={general?.owner?.email} mono />
                    <KeyVal label="Uploaded" value={formatDate(general?.uploadDate)} />
                    <KeyVal label="Location" value={general?.location} />
                    <KeyVal label="Source relay" value={general?.sourceRelay} mono />
                    <KeyVal label="Ingest node" value={general?.ingestNode} mono />
                    <KeyVal label="Uploader IP" value={general?.uploaderIp ?? "Not captured at ingest"} mono />
                  </div>
                </div>
              ) : null}

              {detail && tab === "security" ? (
                <div>
                  <SectionTitle Icon={Radiation}>Security posture</SectionTitle>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${threatBadgeClasses(security?.threatLevel)}`}>
                      {security?.threatLevel ?? "—"}
                    </span>
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${scanBadgeClasses(security?.malwareScanStatus)}`}>
                      Scan: {security?.malwareScanStatus ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[10px] text-violet-100">
                      <Lock className="h-3 w-3" />
                      {security?.encryptionStatus ?? "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <KeyVal label="SHA-256" value={security?.sha256} mono />
                    <KeyVal label="Legacy hash" value={security?.legacyHash} mono />
                    <KeyVal label="Anomaly score" value={security?.anomalyScore != null ? String(security.anomalyScore) : "—"} />
                    <KeyVal label="Integrity" value={security?.integrityStatus} />
                    <KeyVal label="SOC state" value={security?.socState} mono />
                    <KeyVal label="Quarantine" value={security?.quarantineState} />
                    <KeyVal label="Reason" value={security?.quarantineReason} />
                  </div>
                  <SectionTitle Icon={Zap}>Suspicious indicators</SectionTitle>
                  <JsonOrText value={security?.suspiciousIndicators} />
                </div>
              ) : null}

              {detail && tab === "forensics" ? (
                <div className="space-y-3">
                  <SectionTitle Icon={GitBranch}>Pipeline & traces</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <KeyVal label="Relay path" value={forensics?.relayPath} mono />
                    <KeyVal label="Propagation latency" value={`${forensics?.propagationLatencyMs ?? "—"} ms`} />
                    <KeyVal label="Lifecycle" value={forensics?.lifecycleStatus} mono />
                    <KeyVal label="Telemetry status" value={forensics?.telemetryStatus} />
                    <KeyVal label="Verification" value={forensics?.verificationStatus} />
                    <KeyVal label="Auth tag" value={forensics?.authTagStatus} />
                    <KeyVal label="Replication health" value={String(forensics?.replicationHealth ?? "—")} />
                  </div>
                  <SectionTitle Icon={Activity}>Integrity checks</SectionTitle>
                  <ul className="space-y-2">
                    {(forensics?.integrityChecks ?? []).slice(0, 12).map((c) => (
                      <li key={c.id} className="rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2 text-[11px]">
                        <div className="flex justify-between gap-2 text-slate-400">
                          <span>{formatDate(c.checkedAt)}</span>
                          <span className={c.passed ? "text-emerald-400" : "text-rose-400"}>{c.passed ? "PASS" : "FAIL"}</span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-500">{truncate(c.storedHash, 48)}</div>
                      </li>
                    ))}
                    {!forensics?.integrityChecks?.length ? <li className="text-xs text-slate-500">No integrity rows.</li> : null}
                  </ul>
                  <SectionTitle Icon={Radiation}>Sandbox / security analyses</SectionTitle>
                  <ul className="space-y-2">
                    {(forensics?.sandboxSignals ?? []).slice(0, 10).map((s) => (
                      <li key={s.id} className="rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2 text-[11px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-300">{s.riskLevel}</span>
                          <span className="font-mono text-slate-500">{formatDate(s.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-slate-400">Score {s.riskScore ?? "—"} · entropy {s.entropyScore ?? "—"}</div>
                      </li>
                    ))}
                    {!forensics?.sandboxSignals?.length ? <li className="text-xs text-slate-500">No sandbox signals indexed.</li> : null}
                  </ul>
                  <SectionTitle Icon={Network}>Telemetry tail</SectionTitle>
                  <ul className="space-y-1.5">
                    {(forensics?.telemetryTail ?? []).slice(0, 14).map((t) => (
                      <li key={t.id} className="rounded border border-white/[0.05] bg-black/25 px-2 py-1.5 text-[10px] text-slate-300">
                        <span className="font-semibold text-cyan-300/90">{t.stage}</span> · {t.message}
                        <div className="font-mono text-[9px] text-slate-500">{formatDate(t.createdAt)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail && tab === "ai" ? (
                <div className="space-y-3">
                  <SectionTitle Icon={Brain}>AI analysis</SectionTitle>
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 text-sm leading-relaxed text-slate-200">
                    {ai?.summary ?? "—"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <KeyVal label="Classification" value={ai?.classification} mono />
                    <KeyVal label="Confidence" value={ai?.confidence != null ? `${ai.confidence}%` : "—"} />
                  </div>
                  <SectionTitle Icon={ChevronRight}>Suggested actions</SectionTitle>
                  <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
                    {(ai?.suggestedActions ?? []).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  <SectionTitle Icon={Activity}>Deep analysis bundle</SectionTitle>
                  <JsonOrText value={analysis} />
                </div>
              ) : null}

              {detail && tab === "timeline" ? (
                <div>
                  <SectionTitle Icon={Timer}>Investigation chain</SectionTitle>
                  <div className="relative pl-4">
                    <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-cyan-500/40 via-white/10 to-transparent" />
                    <ul className="space-y-3">
                      {events.length === 0 ? (
                        <li className="text-xs text-slate-500">No correlated timeline events.</li>
                      ) : (
                        events.map((ev, idx) => (
                          <li key={`${ev.at}-${idx}`} className="relative">
                            <span className="absolute -left-[3px] top-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <div className="ml-4 rounded-lg border border-white/[0.06] bg-black/35 px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                <span className="text-cyan-400/90">{ev.phase}</span>
                                <span className="text-slate-600">·</span>
                                <span>{formatDate(ev.at)}</span>
                                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] normal-case text-slate-400">
                                  {ev.status}
                                </span>
                              </div>
                              <div className="mt-1 font-mono text-xs text-slate-100">{ev.label}</div>
                              <div className="mt-0.5 text-[11px] text-slate-400">{ev.detail}</div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
});
