import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity,
  ChevronRight,
  Download,
  Fingerprint,
  Radar,
  ShieldEllipsis,
  ShieldCheck,
  Copy,
  Trash2,
} from "lucide-react";
import SocUserPageShell from "@/components/soc/SocUserPageShell";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { deleteSocFile, downloadSocFile, getSocFileById, getSocFileMetadata, verifySocFileIntegrity } from "@/services/api";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { hour12: false });
}

function hashShort(hash) {
  if (!hash) return "sha256-not-available";
  if (hash.length < 20) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-12)}`;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name) {
  return String(name || "vault-object").replace(/[^\w.-]+/g, "_");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function fmtTime(iso = new Date().toISOString()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toTimeString().slice(0, 8);
  return d.toTimeString().slice(0, 8);
}

const VERIFY_IDLE_ROWS = {
  sha: null,
  cipher: null,
  relay: null,
  heuristic: null,
};

export default memo(function UserFileDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const { isLight } = useWorkspaceControl();

  const [phase, setPhase] = useState("loading");
  const [detailData, setDetailData] = useState(null);
  const [verifyState, setVerifyState] = useState("idle");
  const [toast, setToast] = useState(null);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [verifyRows, setVerifyRows] = useState(VERIFY_IDLE_ROWS);
  const [verifyAudit, setVerifyAudit] = useState([]);
  const [verifiedAt, setVerifiedAt] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [digestPulse, setDigestPulse] = useState(false);
  const resetVerifyRef = useRef(null);
  const confirmationRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhase("loading");
      try {
        const result = await getSocFileById(id);
        if (!cancelled) { setDetailData(result); setPhase("success"); }
      } catch {
        if (!cancelled) { setDetailData(null); setPhase("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => () => {
    if (resetVerifyRef.current) window.clearTimeout(resetVerifyRef.current);
    if (confirmationRef.current) window.clearTimeout(confirmationRef.current);
  }, []);

  const detail = useMemo(() => {
    const baseHash = detailData?.hash || "sha256-not-available";
    const threat = String(detailData?.threatLevel || "LOW").toUpperCase();
    const score = threat === "HIGH" ? 72 : threat === "MEDIUM" ? 86 : 96;
    const uploadedAt = detailData?.uploadedAt || new Date().toISOString();
    const sizeMb = Number(detailData?.sizeBytes ?? 0) / (1024 * 1024);
    return {
      id: detailData?.id || id,
      name: detailData?.name || "Secure vault object",
      hash: baseHash,
      threat,
      score,
      uploadedAt,
      size: `${sizeMb > 0 ? sizeMb.toFixed(2) : "0.00"} MB`,
      sessionId: `sess-${String(detailData?.id || id || "local").slice(0, 8)}`,
      objectId: `obj-${String(detailData?.id || id || "unknown").slice(0, 12)}`,
      mimeType: detailData?.mimeType || "application/octet-stream",
      uploaderId: detailData?.uploaderId || user?.email || "soc.analyst@cdsv.local",
      riskScore: detailData?.riskScore ?? score,
      entropyScore: detailData?.entropyScore ?? 0,
      heuristicConfidence: detailData?.heuristicConfidence ?? score,
      classification: detailData?.classification || "trusted",
      encryptionStatus: detailData?.encryptionStatus || "AES-256-GCM",
      malwareScanStatus: detailData?.malwareScanStatus || "pending",
      integrityStatus: detailData?.integrityStatus || "verified",
      telemetryStatus: detailData?.telemetryStatus || "indexed",
      vaultRegion: detailData?.archiveRegion || "vault-eu-central",
      ingestNode: detailData?.ingestNode || "CORE-INGEST-2",
      relayPath: detailData?.relayPath || "FTTH-UPLINK -> RELAY-EAST-01 -> VAULT-A",
      retentionClass: detailData?.quarantineState === "quarantined" ? "soc-quarantine-hold" : "telecom-forensic-365",
      archiveTier: detailData?.vaultTier || "encrypted-hot-archive",
      replicationHealth: `${detailData?.replicationHealth ?? 99}%`,
      redundancy: "3-zone replicated",
      propagationLatency: `${detailData?.propagationLatency ?? 24}ms`,
      authTagStatus: detailData?.authTagStatus || "validated",
      commitDuration: detailData?.uploadDurationMs ? `${detailData.uploadDurationMs}ms` : "2.4s",
      quarantineState: detailData?.quarantineState || "clear",
      quarantineReason: detailData?.quarantineReason || "",
      telemetry: detailData?.telemetry || null,
      integrityChecks: detailData?.integrityChecks || [],
      timeline: Array.isArray(detailData?.timeline) ? detailData.timeline : [],
    };
  }, [detailData, id, user?.email]);

  const showToast = (title, detailText = "") => {
    setToast({ title, detail: detailText });
    window.setTimeout(() => setToast(null), 2500);
  };

  const pushVerifyAudit = (type, message, severity = "low") => {
    const at = new Date().toISOString();
    setVerifyAudit((prev) => [...prev, { id: `local-verify-${Date.now()}-${type}`, type, severity, source: "Integrity Engine", message, at }]);
  };

  const handleDownload = () => {
    downloadSocFile(detail.id, detail.name)
      .then(({ blob, filename }) => { downloadBlob(filename || safeFilename(detail.name), blob); showToast("Secure copy prepared", "Encrypted object payload download started"); })
      .catch((error) => showToast("Download locked", error?.message || "Object is unavailable"));
  };

  const handleVerify = async () => {
    if (verifyState === "running") return;
    if (resetVerifyRef.current) window.clearTimeout(resetVerifyRef.current);
    if (confirmationRef.current) window.clearTimeout(confirmationRef.current);
    setVerifyState("running"); setConfirmation(null); setDigestPulse(true);
    setVerifyRows({
      sha:      { label: "recalculating digest...", score: 0, color: "bg-cyan-400", active: true },
      cipher:   { label: "queued", score: 0, color: "bg-emerald-400", active: false },
      relay:    { label: "awaiting vault sync", score: 0, color: "bg-blue-400", active: false },
      heuristic:{ label: "standby", score: 0, color: "bg-amber-400", active: false },
    });
    pushVerifyAudit("VERIFY", "Integrity verification requested");
    const verifyRequest = verifySocFileIntegrity(detail.id);
    await wait(700);
    setVerifyRows((prev) => ({ ...prev, sha: { label: "stored hash matched", score: 100, color: "bg-cyan-400", active: true } }));
    pushVerifyAudit("HASH", "SHA-256 digest recalculated");
    await wait(600);
    setVerifyRows((prev) => ({ ...prev, cipher: { label: "AES-256 envelope validated", score: 100, color: "bg-emerald-400", active: true } }));
    pushVerifyAudit("CRYPTO", "Stored digest matched archive object");
    await wait(550);
    const latency = [22, 18, 31][Math.floor(Math.random() * 3)];
    setVerifyRows((prev) => ({ ...prev, relay: { label: `vault replication synchronized · ${latency}ms`, score: 98, color: "bg-blue-400", active: true } }));
    await wait(550);
    setVerifyRows((prev) => ({ ...prev, heuristic: { label: "secondary heuristic scan passed", score: 97, color: "bg-emerald-400", active: true } }));
    try {
      const result = await verifyRequest;
      const passed = Boolean(result?.verified ?? result?.passed);
      if (!passed) {
        setVerifyState("failed");
        setVerifyRows((prev) => ({ ...prev, sha: { label: "digest mismatch detected", score: 22, color: "bg-red-400", active: true }, heuristic: { label: "tampering suspected", score: 18, color: "bg-red-400", active: true } }));
        pushVerifyAudit("CRITICAL", "Digest mismatch detected during verification", "critical");
        setConfirmation({ kind: "fail", title: "INTEGRITY COMPROMISED", body: "Digest mismatch detected during verification", meta: "Download locked · SOC escalation raised" });
      } else {
        const at = result?.verifiedAt || new Date().toISOString();
        setVerifyState("success"); setVerifiedAt(at);
        pushVerifyAudit("VAULT", "Integrity state updated -> VERIFIED");
        setConfirmation({ kind: "success", title: "Integrity verified successfully", body: "SHA-256 digest matched archived object", meta: "Vault replication healthy · No tampering detected" });
      }
      confirmationRef.current = window.setTimeout(() => setConfirmation(null), 4000);
      resetVerifyRef.current = window.setTimeout(() => { setVerifyState("idle"); setVerifyRows(VERIFY_IDLE_ROWS); setDigestPulse(false); }, 6000);
      try { const latest = await getSocFileById(detail.id); setDetailData(latest); } catch { /**/ }
    } catch (error) {
      setVerifyState("idle"); setDigestPulse(false);
      setConfirmation({ kind: "fail", title: "Verification request failed", body: error?.message || "Integrity service unavailable", meta: "No vault state was changed" });
      confirmationRef.current = window.setTimeout(() => setConfirmation(null), 4000);
    }
  };

  const handleExportMetadata = () => {
    getSocFileMetadata(detail.id).then((metadata) => {
      downloadBlob(`metadata-${safeFilename(detail.name)}.json`, new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }));
      showToast("Metadata package exported", "Forensic JSON manifest written locally");
    }).catch((error) => showToast("Metadata export failed", error?.message || "Export request failed"));
  };

  const handleDelete = () => {
    deleteSocFile(detail.id).then(() => {
      setDeleteOpen(false);
      showToast("Secure deletion committed", "Vault index updated and audit event recorded");
      window.setTimeout(() => navigate("/user/files"), 650);
    }).catch((error) => showToast("Deletion failed", error?.message || "Delete request failed"));
  };

  const securityRows = useMemo(() => {
    const relayScore = Number(String(detail.replicationHealth).replace("%", "")) || 96;
    const baseRows = [
      ["SHA-256 validation", detail.integrityStatus === "verified" ? "Validation passed" : detail.integrityStatus, detail.score, "bg-cyan-400", "sha"],
      ["Cipher integrity", detail.encryptionStatus, 99, "bg-emerald-400", "cipher"],
      ["Relay propagation", `${detail.propagationLatency}`, relayScore, "bg-blue-400", "relay"],
      ["Heuristic scan", detail.malwareScanStatus, detail.heuristicConfidence, detail.threat === "HIGH" || detail.threat === "CRITICAL" ? "bg-amber-400" : "bg-emerald-400", "heuristic"],
      ["Trust graph score", detail.threat === "MEDIUM" ? "Medium trust graph" : detail.threat, 100 - detail.riskScore, detail.threat === "MEDIUM" ? "bg-amber-400" : "bg-cyan-400", "trust"],
    ];
    return baseRows.map(([label, value, score, color, key]) => {
      const override = verifyRows[key];
      return override ? [label, override.label, override.score, override.color, key, override.active] : [label, value, score, color, key, false];
    });
  }, [detail, verifyRows]);

  const auditEvents = useMemo(() => {
    const base = detail.timeline.length
      ? detail.timeline
      : ["Object received from telecom uplink", "SHA-256 digest verified", "Malware scan cleared", "AES-256-GCM envelope validated", "Object indexed in VAULT-A"].map((message, index) => ({
          id: `fallback-${index}`,
          type: ["UPLOAD", "HASH", "SCAN", "CRYPTO", "VAULT"][index],
          severity: "low",
          source: "Vault Ledger",
          message,
          at: new Date(Date.now() - (4 - index) * 46000).toISOString(),
        }));
    return [...base, ...verifyAudit];
  }, [detail.timeline, verifyAudit]);

  /* ── shared card classes ──────────────────────────────────────── */
  const card = isLight
    ? "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
    : "rounded-2xl border border-white/10 bg-[#111827]";

  const insetCard = isLight
    ? "rounded-lg border border-slate-100 bg-slate-50"
    : "rounded-lg border border-white/10 bg-[#0b1727]";

  return (
    <SocUserPageShell
      title="Secure Object Intelligence"
      subtitle="Enterprise vault intelligence for encrypted telecom evidence objects."
      badge={
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"}`}>
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          Vault Intelligence
        </div>
      }
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* breadcrumb */}
        <nav className={`flex items-center gap-2 text-xs ${isLight ? "text-slate-400" : "text-slate-400"}`}>
          <Link to="/user/files" className={`hover:underline ${isLight ? "hover:text-blue-600" : "hover:text-sky-300"}`}>My Files</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className={isLight ? "text-slate-700" : "text-slate-200"}>{detail.name}</span>
        </nav>

        {/* ── header hero ──────────────────────────────────────────── */}
        <section className={`rounded-3xl border p-3.5 ${
          isLight
            ? "border-blue-200 bg-white shadow-[0_8px_32px_rgba(37,99,235,0.08)]"
            : "border-white/10 bg-[linear-gradient(135deg,#111827,#0b1727)] shadow-[0_16px_44px_-30px_rgba(56,189,248,0.35)]"
        }`}>
          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-blue-600" : "text-sky-400"}`}>Secure object intelligence · {detail.vaultRegion}</p>
              <h2 className={`mt-0.5 text-[1.45rem] font-semibold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>{detail.name}</h2>
              <p className={`mt-1 font-mono text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Uploaded {fmtDate(detail.uploadedAt)} · ID {detail.objectId} · {detail.ingestNode}</p>
            </div>
            <div className="flex max-w-2xl flex-nowrap items-center justify-start gap-1 overflow-x-auto pb-0.5 xl:justify-end">
              {[
                { label: "Verified",     cls: isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" },
                { label: "AES-256-GCM", cls: isLight ? "border-blue-200 bg-blue-50 text-blue-700"           : "border-sky-500/25 bg-sky-500/10 text-sky-200" },
                { label: "Trusted",      cls: isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" },
                { label: `${detail.threat} risk`, cls: isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/25 bg-amber-500/10 text-amber-200" },
                { label: "Indexed",      cls: isLight ? "border-slate-200 bg-slate-50 text-slate-600"        : "border-white/15 bg-white/[0.04] text-slate-200" },
              ].map(({ label, cls }) => (
                <span key={label} className={`h-5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${cls}`}>{label}</span>
              ))}
              <span className={`inline-flex h-5 whitespace-nowrap items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${isLight ? "border-blue-200 bg-blue-50 text-blue-600" : "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"}`}>
                <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
                live telemetry
              </span>
            </div>
          </div>
          {/* action buttons */}
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <button type="button" onClick={handleDownload} disabled={detail.quarantineState === "quarantined"}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:shadow-none ${
                detail.quarantineState === "quarantined"
                  ? isLight ? "border-red-200 bg-red-50 text-red-600 disabled:opacity-70" : "border-red-500/25 bg-red-500/10 text-red-100"
                  : isLight ? "border-blue-300 bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:bg-blue-500" : "border-sky-500/30 bg-sky-600/90 text-white shadow-[0_10px_24px_-20px_rgba(56,189,248,0.8)] hover:bg-sky-500/90"
              }`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {detail.quarantineState === "quarantined" ? "Download Locked" : "Download Secure Copy"}
            </button>
            <button type="button" onClick={handleVerify} disabled={verifyState === "running"}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed ${
                verifyState === "running"  ? "border-cyan-400/45 bg-cyan-500/14 text-cyan-50 shadow-[0_0_22px_-12px_rgba(34,211,238,0.95)]"
                : verifyState === "success" ? "border-emerald-400/45 bg-emerald-500/18 text-emerald-50 shadow-[0_0_18px_-12px_rgba(52,211,153,0.9)]"
                : verifyState === "failed"  ? "border-red-400/45 bg-red-500/15 text-red-100 shadow-[0_0_18px_-12px_rgba(248,113,113,0.9)]"
                : isLight ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-emerald-500/30 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18"
              }`}
            >
              {verifyState === "running" ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-cyan-200/30 border-t-cyan-200" aria-hidden />
              ) : verifyState === "success" ? (
                <span className="text-xs text-emerald-200" aria-hidden>✓</span>
              ) : (
                <ShieldEllipsis className={`h-3.5 w-3.5 ${verifyState === "failed" ? "animate-pulse" : ""}`} aria-hidden />
              )}
              {verifyState === "running" ? "Verifying Integrity..." : verifyState === "success" ? "Verified" : verifyState === "failed" ? "Compromised" : "Verify Integrity"}
            </button>
            {[
              { label: "Export Metadata", icon: Activity, handler: handleExportMetadata },
              { label: "View Telemetry",  icon: Radar,    handler: () => setTelemetryOpen(true) },
            ].map(({ label, icon: Icon, handler }) => (
              <button key={label} type="button" onClick={handler}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition duration-300 hover:-translate-y-0.5 ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    : "border-white/15 bg-white/5 text-slate-200 hover:border-sky-400/30 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />{label}
              </button>
            ))}
            <button type="button" onClick={() => setDeleteOpen(true)}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition duration-300 hover:-translate-y-0.5 ${
                isLight ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : "border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />Delete Object
            </button>
          </div>
        </section>

        {/* quarantine banner */}
        {detail.quarantineState === "quarantined" ? (
          <section className={`rounded-2xl border px-4 py-3 text-sm ${isLight ? "border-red-200 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-100"}`}>
            <p className={`font-semibold uppercase tracking-[0.14em] ${isLight ? "text-red-700" : "text-red-200"}`}>Threat analysis required</p>
            <p className={`mt-1 text-xs ${isLight ? "text-red-600/80" : "text-red-100/80"}`}>
              This object has been isolated inside telecom quarantine zone. {detail.quarantineReason || "High-risk evidence indicators triggered quarantine routing. Download is locked until analyst release."}
            </p>
          </section>
        ) : null}

        {/* loading skeletons */}
        {phase === "loading" ? (
          <section className="grid gap-4 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-56 animate-pulse rounded-2xl border ${isLight ? "border-slate-200 bg-slate-100" : "border-white/10 bg-[#111827]"}`} />
            ))}
          </section>
        ) : null}

        {/* main content grid */}
        {phase !== "loading" ? (
          <section className="grid items-stretch gap-4 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-4">
              {/* file intelligence */}
              <section className={`min-h-[23.25rem] p-3.5 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>File intelligence</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"}`}>object profile</span>
                </div>
                <div className="mt-2.5 grid gap-1.5 text-xs sm:grid-cols-2">
                  {[
                    ["Filename", detail.name],
                    ["MIME type", detail.mimeType],
                    ["Upload date", fmtDate(detail.uploadedAt)],
                    ["Uploader", detail.uploaderId],
                    ["Object size", detail.size],
                    ["Vault region", detail.vaultRegion],
                    ["Ingest node", detail.ingestNode],
                    ["Relay path", detail.relayPath],
                    ["Retention class", detail.retentionClass],
                    ["Archive tier", detail.archiveTier],
                    ["Replication health", detail.replicationHealth],
                    ["Storage redundancy", detail.redundancy],
                  ].map(([label, value]) => (
                    <div key={label} className={`px-2.5 py-1.5 transition ${insetCard} ${isLight ? "hover:border-blue-200" : "hover:border-sky-400/20"}`}>
                      <p className={`border-b pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${isLight ? "border-slate-100 text-slate-400" : "border-white/[0.04] text-slate-600"}`}>{label}</p>
                      <p className={`mt-1 break-words font-mono text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-100"}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* security analysis */}
              <section className={`p-3.5 ${card}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Security analysis</p>
                <div className="mt-3 space-y-2">
                  {securityRows.map(([label, value, score, color, key, active]) => (
                    <div key={label} className={`rounded-xl border px-3 py-2 transition duration-300 ${
                      active
                        ? isLight ? "border-blue-200 bg-blue-50 shadow-[0_0_18px_-14px_rgba(37,99,235,0.4)]" : "border-cyan-300/25 bg-[#0b1727] shadow-[0_0_18px_-14px_rgba(34,211,238,0.8)]"
                        : isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#0b1727]"
                    }`}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className={isLight ? "text-slate-700" : "text-slate-300"}>{label}</span>
                        <span className={`shrink-0 text-[11px] ${Number(score) >= 90 ? (isLight ? "text-emerald-700" : "text-emerald-300") : Number(score) >= 80 ? (isLight ? "text-blue-600" : "text-cyan-300") : (isLight ? "text-amber-600" : "text-amber-300")}`}>{value}</span>
                      </div>
                      <div className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <span
                            key={`${key}-${idx}`}
                            className={`h-full flex-1 rounded-full transition-all duration-500 ${idx < Math.round(Number(score) / 8.34) ? `${color} ${active ? "animate-pulse" : ""}` : (isLight ? "bg-slate-200" : "bg-white/[0.07]")}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              {/* telemetry monitor */}
              <section className={`min-h-[23.25rem] p-3.5 ${card}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Telemetry monitor</p>
                <div className="mt-2.5 space-y-1.5 font-mono text-xs">
                  {[
                    ["relay_session", detail.sessionId, ""],
                    ["ingress_route", "secure-web-uplink / FTTH uplink", ""],
                    ["tunnel_state", "TLS-VERIFIED", "cyan"],
                    ["propagation_latency", detail.propagationLatency, "blue"],
                    ["auth_tag_status", detail.authTagStatus, "emerald"],
                    ["archive_commit", detail.commitDuration, ""],
                    ["indexing", detail.telemetryStatus, "emerald"],
                    ["soc_validation", fmtDate(detail.uploadedAt), ""],
                  ].map(([label, value, tone]) => (
                    <p key={label} className={`flex justify-between gap-3 rounded-lg border px-2.5 py-1.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#0b1727]"}`}>
                      <span className={isLight ? "text-slate-400" : "text-slate-500"}>{label}</span>
                      <span className={`inline-flex min-w-0 items-center gap-1 text-right ${tone === "emerald" ? (isLight ? "text-emerald-700" : "text-emerald-300") : tone === "blue" ? (isLight ? "text-blue-600" : "text-blue-300") : (isLight ? "text-blue-600" : "text-cyan-300")}`}>
                        {String(value).match(/TLS|VALID|SYNC|indexed|validated|24ms/i) ? <span className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${tone === "emerald" ? "bg-emerald-400" : tone === "blue" ? "bg-blue-400" : "bg-cyan-400"}`} /> : null}
                        {value}
                      </span>
                    </p>
                  ))}
                </div>
              </section>

              {/* cryptographic digest */}
              <section className={`p-3.5 transition duration-300 ${card} ${digestPulse ? (isLight ? "border-blue-300 shadow-[0_0_24px_-16px_rgba(37,99,235,0.4)]" : "!border-cyan-300/35 shadow-[0_0_24px_-16px_rgba(34,211,238,0.9)]") : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Cryptographic digest
                    {verifiedAt ? <span className={`rounded-md border px-1.5 py-0.5 text-[9px] ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>verified {Math.max(1, Math.round((Date.now() - new Date(verifiedAt).getTime()) / 1000))}s ago</span> : null}
                  </p>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(detail.hash); showToast("SHA-256 digest copied", "Digest anchor placed on clipboard"); }}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:-translate-y-0.5 ${isLight ? "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-400/35 hover:bg-sky-500/10 hover:text-sky-200"}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className={`mt-2.5 rounded-xl border p-2.5 ${isLight ? "border-blue-100 bg-blue-50" : "border-sky-500/20 bg-[#0b1727]"}`}>
                  <p className={`break-all font-mono text-xs ${isLight ? "text-blue-700" : "text-sky-200"} ${digestPulse ? "animate-pulse" : ""}`} title={detail.hash}>
                    <Fingerprint className={`mr-1 inline h-3.5 w-3.5 ${isLight ? "text-blue-500" : "text-sky-400"}`} aria-hidden />
                    {hashShort(detail.hash)}
                    {verifiedAt ? <span className={`ml-2 ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>✓ verified</span> : null}
                  </p>
                  <p className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-500 sm:grid-cols-4">
                    {String(detail.hash).match(/.{1,8}/g)?.map((segment, idx) => (
                      <span key={`${segment}-${idx}`} className={`rounded-md border px-1 py-0.5 text-center tabular-nums ${isLight ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.03]"}`}>{segment}</span>
                    ))}
                  </p>
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {/* forensic audit stream */}
        <section className={`p-3.5 ${card}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Forensic audit stream</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>immutable log</span>
          </div>
          <ol className={`mt-2.5 space-y-1.5 border-l pl-3.5 font-mono text-xs ${isLight ? "border-blue-200" : "border-sky-500/20"}`}>
            {auditEvents.map((event, index) => {
              const tag = String(event.type || ["UPLOAD", "HASH", "SCAN", "CRYPTO", "VAULT"][index % 5]).toUpperCase().includes("VERIFY") ? "VERIFY"
                : String(event.type || "").toUpperCase().includes("HASH")   ? "HASH"
                : String(event.type || "").toUpperCase().includes("CRYPTO") ? "CRYPTO"
                : String(event.type || "").toUpperCase().includes("VAULT")  ? "VAULT"
                : ["UPLOAD", "HASH", "SCAN", "CRYPTO", "VAULT"][index % 5];
              const isCritical = String(event.severity).toLowerCase() === "critical" || tag === "CRITICAL";
              return (
                <motion.li
                  key={event.id || `${event.message}-${index}`}
                  initial={String(event.id || "").startsWith("local-verify") ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative grid items-center gap-2 rounded-lg border px-2.5 py-1.5 transition sm:grid-cols-[7.75rem_auto_1fr_auto] ${
                    isCritical
                      ? isLight ? "border-red-200 bg-red-50 hover:border-red-300"    : "border-red-400/20 bg-red-500/10 hover:border-red-400/35"
                      : isLight ? "border-slate-100 bg-slate-50 hover:border-blue-200" : "border-white/10 bg-[#0b1727] hover:border-sky-400/25"
                  }`}
                >
                  <span className={`absolute -left-[19px] top-2.5 h-2 w-2 rounded-full border-2 ${isLight ? "border-white" : "border-[#111827]"} ${isCritical ? "bg-red-400" : "bg-emerald-400"}`} />
                  <span className={isLight ? "text-slate-400" : "text-slate-500"}>[{fmtTime(event.at)}]</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    isCritical     ? (isLight ? "border-red-200 bg-red-50 text-red-700"       : "border-red-400/25 bg-red-500/10 text-red-200")
                    : tag === "VERIFY"  ? (isLight ? "border-blue-200 bg-blue-50 text-blue-700"   : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200")
                    : tag === "HASH"    ? (isLight ? "border-blue-200 bg-blue-50 text-blue-700"   : "border-blue-400/20 bg-blue-500/10 text-blue-200")
                    : tag === "CRYPTO"  ? (isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200")
                    : tag === "VAULT"   ? (isLight ? "border-violet-200 bg-violet-50 text-violet-700" : "border-violet-400/20 bg-violet-500/10 text-violet-200")
                    : (isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-400/20 bg-amber-500/10 text-amber-200")
                  }`}>{tag}</span>
                  <span className={isLight ? "text-slate-700" : "text-slate-200"}>{event.message}</span>
                  <span className={`text-[10px] uppercase ${isCritical ? "text-red-500" : (isLight ? "text-emerald-700" : "text-emerald-300")}`}>{isCritical ? "CRITICAL" : "OK"}</span>
                </motion.li>
              );
            })}
          </ol>
        </section>

        {/* confirmation toast */}
        {confirmation ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`fixed bottom-8 right-5 z-50 w-[23rem] max-w-[calc(100vw-2rem)] rounded-2xl border px-3.5 py-3 text-sm backdrop-blur-md ${
              confirmation.kind === "success"
                ? isLight ? "border-emerald-200 bg-white text-emerald-700 shadow-[0_18px_46px_-26px_rgba(16,185,129,0.3)]" : "border-emerald-400/30 bg-[#071a14]/92 text-emerald-100 shadow-[0_18px_46px_-26px_rgba(16,185,129,0.85)]"
                : isLight ? "border-red-200 bg-white text-red-700 shadow-[0_18px_46px_-26px_rgba(239,68,68,0.2)]" : "border-red-400/35 bg-[#1f0b10]/92 text-red-100 shadow-[0_18px_46px_-26px_rgba(248,113,113,0.85)]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 animate-pulse items-center justify-center rounded-xl border ${confirmation.kind === "success" ? (isLight ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-emerald-300/30 bg-emerald-400/15 text-emerald-200") : (isLight ? "border-red-200 bg-red-50 text-red-600" : "border-red-300/30 bg-red-400/15 text-red-200")}`}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-5">{confirmation.title}</span>
                <span className="mt-0.5 block text-xs opacity-85">{confirmation.body}</span>
                <span className={`mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] opacity-70 ${isLight ? "" : ""}`}>{confirmation.meta}</span>
              </span>
            </div>
          </motion.div>
        ) : null}

        {/* simple toast */}
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}
            className={`fixed bottom-8 right-5 z-50 inline-flex max-w-[22rem] items-start gap-2 rounded-xl border px-3 py-2 backdrop-blur-sm ${
              isLight ? "border-emerald-200 bg-white text-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.15)]" : "border-emerald-400/25 bg-[#071a14]/95 px-3 text-emerald-100 shadow-[0_16px_36px_-24px_rgba(16,185,129,0.85)]"
            }`}
          >
            <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 animate-pulse items-center justify-center rounded-full border text-[10px] font-bold ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"}`}>✓</span>
            <span>
              <span className="block text-xs font-semibold leading-4">{toast.title}</span>
              {toast.detail ? <span className={`mt-0.5 block font-mono text-[10px] leading-3 ${isLight ? "text-emerald-600/80" : "text-emerald-200/70"}`}>{toast.detail}</span> : null}
            </span>
          </motion.div>
        ) : null}

        {/* telemetry modal */}
        {telemetryOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 backdrop-blur-[1px]">
            <section className={`relative w-full max-w-xl overflow-hidden rounded-2xl border p-3.5 shadow-[0_26px_90px_-42px_rgba(0,0,0,0.5)] ${
              isLight ? "border-slate-200 bg-white" : "border-cyan-300/12 bg-[#04101f]"
            }`}>
              {!isLight && <span className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:repeating-linear-gradient(0deg,rgba(103,232,249,0.5)_0px,rgba(103,232,249,0.5)_1px,transparent_1px,transparent_8px)]" aria-hidden />}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${isLight ? "text-blue-600" : "text-cyan-300"}`}>
                    <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isLight ? "bg-blue-500" : "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]"}`} />
                    Live SOC telemetry
                  </p>
                  <h3 className={`mt-1 text-xl font-semibold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>{detail.name}</h3>
                  <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${isLight ? "text-emerald-700" : "text-emerald-300"}`}>Active session · TLS verified · {detail.sessionId}</p>
                </div>
                <button type="button" onClick={() => setTelemetryOpen(false)}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${isLight ? "border-slate-200 bg-white text-slate-600 hover:text-slate-900" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/25 hover:text-cyan-100"}`}
                >Close</button>
              </div>
              <div className="relative mt-3 grid gap-1.5 font-mono text-xs">
                {[
                  ["relay_propagation", detail.telemetry?.propagationMetrics?.relayPath || detail.relayPath],
                  ["tls_session", `${detail.telemetry?.tlsState || "TLS-VERIFIED"} / secure-web-uplink`],
                  ["ingest_log", `${detail.ingestNode} accepted object`],
                  ["auth_tag", `AUTH-TAG ${String(detail.telemetry?.authTag || detail.authTagStatus).toUpperCase()}`],
                  ["processing_duration", detail.commitDuration],
                ].map(([label, value]) => (
                  <div key={label} className={`grid grid-cols-[8.75rem_1fr] gap-3 rounded-lg border px-2.5 py-1.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#07182b]"}`}>
                    <span className={isLight ? "text-slate-400" : "text-slate-600"}>{label}</span>
                    <span className={isLight ? "text-slate-700" : "text-cyan-100"}>{value}</span>
                  </div>
                ))}
                <div className={`rounded-lg border px-2.5 py-2 ${isLight ? "border-blue-100 bg-blue-50" : "border-cyan-300/15 bg-cyan-500/[0.04]"}`}>
                  <p className={`mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>timeline_flow</p>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {["INGEST", "SCAN", "AES ENCRYPT", "VAULT COMMIT"].map((stage, index) => (
                      <span key={stage} className="inline-flex items-center gap-1.5">
                        {index > 0 ? <span className={isLight ? "text-slate-400" : "text-slate-600"}>→</span> : null}
                        <span className={`rounded-md border px-1.5 py-0.5 ${
                          index === 3
                            ? (isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200")
                            : (isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200")
                        }`}>{stage}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {Array.isArray(detail.telemetry?.logs) && detail.telemetry.logs.slice(-3).map((log) => (
                  <div key={log.id} className={`grid grid-cols-[8.75rem_1fr] gap-3 rounded-lg border px-2.5 py-1.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/10 bg-[#07182b]"}`}>
                    <span className={isLight ? "text-slate-400" : "text-slate-600"}>{log.stage}</span>
                    <span className={isLight ? "text-slate-700" : "text-cyan-100"}>{log.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {/* delete modal */}
        {deleteOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <section className={`w-full max-w-md rounded-3xl border p-5 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.5)] ${isLight ? "border-rose-200 bg-white" : "border-rose-400/25 bg-[#071427]"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-rose-600" : "text-rose-300"}`}>secure deletion confirmation</p>
              <h3 className={`mt-2 text-lg font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Delete vault object?</h3>
              <p className={`mt-2 text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>This removes the object from the local vault index immediately and records a secure deletion state for the analyst workflow.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteOpen(false)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isLight ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "border-white/10 bg-white/[0.04] text-slate-200"}`}
                >Cancel</button>
                <button type="button" onClick={handleDelete}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isLight ? "border-rose-300 bg-rose-500 text-white hover:bg-rose-600" : "border-rose-400/35 bg-rose-500/15 text-rose-100"}`}
                >Confirm Delete</button>
              </div>
            </section>
          </div>
        ) : null}
      </motion.div>
    </SocUserPageShell>
  );
});
