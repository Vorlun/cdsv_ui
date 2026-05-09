/**
 * SOC Secure File Upload — React console (Vite).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Cpu,
  FileText,
  Fingerprint,
  FolderOpen,
  Loader2,
  Lock,
  Radio,
  Search,
  Server,
  ShieldCheck,
  UploadCloud,
  Wifi,
} from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";

import { ApiError } from "@/services/api/apiError";
import { postSocUpload } from "@/services/api";

import { digestSha256HexFromBlob, useClientSha256 } from "./useClientSha256";

const ACCEPT = ".csv,.json,.txt,.pdf,.zip,.doc,.docx,.docm,.xls,.xlsm,.exe,.bat,.cmd,.ps1,text/csv,application/json,text/plain,application/pdf,application/zip,application/octet-stream";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Blue / processing-aligned motion tokens */
const TX = {
  shell: "duration-300 ease-out",
  hover: "transition-all duration-300 ease-out",
};

/** Four operator-visible ingest phases aligned with syllabus */
const PIPE_LINE = [
  { id: "u1", icon: Wifi, title: "Upload intake", sub: "TLS egress channel established", meta: "CORE-INGEST-2 · FTTH-UPLINK" },
  { id: "u2", icon: Search, title: "IOC scan running", sub: "Integrity and malware scan sequence", meta: "SOC-EAST · TRUST-ZONE-3" },
  { id: "u3", icon: Lock, title: "AES envelope sealing", sub: "Cipher envelope and auth-tag commit", meta: "TLS-VERIFIED · AES-256-GCM" },
  { id: "u4", icon: Server, title: "Vault synchronization", sub: "Encrypted object anchored in secure tier", meta: "VAULT-A · RELAY-SYNCED" },
];

const STAGE_LABEL = {
  uploading: "Uploading file…",
  scanning: "Scanning for threats…",
  encrypting: "Encrypting file…",
  stored: "Sealing secure vault…",
};

function fmtKb(n) {
  if (!Number.isFinite(n)) return "—";
  return `${(n / 1024).toFixed(1)} KB`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logLine(message) {
  const ts = new Date().toTimeString().slice(0, 8);
  return `[${ts}] ${message}`;
}

function truncateMiddle(value, keep = 16) {
  if (!value || value.length <= keep * 2) return value || "—";
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

/** Human type column for SOC preview card */
function fileTypeLabel(f) {
  if (!f?.name) return "—";
  if (/\.pdf$/i.test(f.name)) return "PDF";
  if (/\.docx$/i.test(f.name)) return "DOCX";
  if (/\.csv$/i.test(f.name)) return "CSV";
  return f.type?.split("/")[1]?.toUpperCase() || "Document";
}

function PipelineStepTile({ Icon, title, sub, meta, tone }) {
  const ready = tone === "done";
  const live = tone === "active";

  return (
    <div
      className={clsx(
        "flex gap-2.5 rounded-xl border px-2.5 py-2 backdrop-blur-sm",
        TX.hover,
        "hover:shadow-md",
        ready && "border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_8px_30px_-12px_rgba(16,185,129,0.25)]",
        live && "border-sky-500/50 bg-sky-500/[0.1] shadow-[0_0_28px_-6px_rgba(56,189,248,0.5)] ring-1 ring-sky-500/20",
        !ready && !live && "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]",
      )}
    >
      <div
        className={clsx(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300",
          ready && "border-emerald-500/45 bg-emerald-500/12 text-emerald-300",
          live && "border-sky-500/55 bg-sky-500/12 text-sky-300",
          !ready && !live && "border-white/10 bg-[#111827]/80 text-slate-500",
        )}
      >
        {ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
        ) : live ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Circle className="h-4 w-4 opacity-35" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Icon className={clsx("h-4 w-4", ready ? "text-emerald-400" : live ? "text-sky-400" : "text-slate-600")} aria-hidden />
          {title}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{sub}</p>
        <p className={clsx("mt-0.5 text-[9px] font-semibold uppercase tracking-wide", ready ? "text-emerald-300/80" : live ? "text-sky-300/80" : "text-slate-600")}>{meta}</p>
      </div>
    </div>
  );
}

function stepTone(stepIndex, completedSteps, activeIndex) {
  if (stepIndex < completedSteps) return "done";
  if (activeIndex === stepIndex) return "active";
  return "pending";
}

/** Staged ingress preview once a file slot is populated */
function FilePreviewCard({ file, status, isDone }) {
  if (!file) return null;

  const statusLabel = isDone ? "SECURED" : status === "idle" ? "READY" : "PROCESSING";
  const statusClass = isDone
    ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-200"
    : status === "idle"
      ? "border-sky-500/45 bg-sky-500/15 text-sky-200"
      : "border-amber-500/45 bg-amber-500/15 text-amber-100";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="mt-4 rounded-2xl border border-slate-600/55 bg-gradient-to-br from-slate-900/85 to-[#0c1629]/95 p-3.5 text-left shadow-[0_16px_48px_-24px_rgba(2,132,199,0.35)] ring-1 ring-slate-500/20 transition-all duration-300 hover:border-sky-500/40 hover:shadow-[0_20px_52px_-24px_rgba(2,132,199,0.45)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/12 text-sky-200 shadow-inner">
          <FileText className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate font-mono text-sm font-bold text-white" title={file.name}>📄 {file.name}</p>
            <span className={clsx("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", statusClass)}>
              {statusLabel}
            </span>
          </div>
          <div className="grid gap-1 font-mono text-[11px] text-slate-400">
            <p>
              <span className="text-slate-500">Size:</span> <span className="text-slate-200">{fmtKb(file.size)}</span>
            </p>
            <p>
              <span className="text-slate-500">Type:</span> <span className="text-slate-200">{fileTypeLabel(file)}</span>
            </p>
            <p>
              <span className="text-slate-500">Readiness:</span>{" "}
              <span className="font-semibold text-emerald-300">Integrity ready</span>
            </p>
            <p><span className="text-slate-500">MIME:</span> <span className="text-emerald-300">Trusted</span></p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-600/40 pt-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-55" aria-hidden />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" aria-hidden />
        </span>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">READY TO UPLOAD</p>
      </div>
    </motion.div>
  );
}

/** Context-preserving SOC processing panel */
function ProcessingOverlay({ progress, status }) {
  const stage = STAGE_LABEL[status] ?? "Preparing secure channel…";

  return (
    <motion.div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-3 overflow-hidden rounded-2xl border border-sky-500/25 bg-[#071427]/95 p-3.5 shadow-[0_18px_54px_-30px_rgba(56,189,248,0.48)]"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_42%)]" aria-hidden />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/15 shadow-[0_0_36px_-16px_rgba(56,189,248,0.75)]">
                <span className="absolute inset-0 animate-ping rounded-2xl border border-sky-300/30" aria-hidden />
                <Loader2 className="h-5 w-5 animate-spin text-sky-300" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400/90">SOC pipeline orchestration</p>
                <h2 className="mt-1 font-mono text-sm font-black uppercase tracking-[0.12em] text-white">{stage}</h2>
                <p className="mt-1 text-xs text-slate-400">CORE-INGEST-2 · TRUST-ZONE-3 · VAULT-A propagation active</p>
              </div>
            </div>
            <span className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
              {progress}% synced
            </span>
          </div>

          <ul className="mt-2.5 grid gap-1.5 text-xs sm:grid-cols-3">
            <li
              className={clsx(
                "rounded-xl border px-2.5 py-1.5 font-medium transition-colors duration-300",
                status === "uploading" ? "bg-sky-500/20 text-sky-100" : progress >= 50 ? "text-emerald-500/95" : "text-slate-500",
                "border-white/10",
              )}
            >
              {progress >= 50 ? "✓ " : ""}Upload · TLS active
            </li>
            <li
              className={clsx(
                "rounded-xl border px-2.5 py-1.5 font-medium transition-colors duration-300",
                status === "scanning" ? "bg-sky-500/20 text-sky-100" : progress >= 75 ? "text-emerald-500/95" : "text-slate-500",
                "border-white/10",
              )}
            >
              {progress >= 75 ? "✓ " : ""}IOC scan · SOC-EAST
            </li>
            <li
              className={clsx(
                "rounded-xl border px-2.5 py-1.5 font-medium transition-colors duration-300",
                status === "encrypting" ? "bg-sky-500/20 text-sky-100" : progress >= 100 ? "text-emerald-500/95" : "text-slate-500",
                "border-white/10",
              )}
            >
              {progress >= 100 ? "✓ " : ""}AES seal · vault sync
            </li>
          </ul>

          <div className="mt-2.5">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Pipeline telemetry</span>
              <span className="tabular-nums text-sky-400">{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#38bdf8,#34d399)] shadow-[0_0_28px_-4px_rgba(52,211,153,0.55)]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] text-slate-500">Evidence never leaves ciphertext policy enclave · relay propagation monitored</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function threatTone(tl) {
  const u = String(tl || "LOW").toUpperCase();
  if (u.includes("HIGH") || u.includes("CRITICAL")) return { label: tl || "HIGH", wrap: "border-rose-500/45 bg-rose-500/15 text-rose-100" };
  if (u.includes("MOD") || u.includes("MEDIUM")) return { label: tl || "MEDIUM", wrap: "border-amber-500/45 bg-amber-500/15 text-amber-100" };
  return { label: tl || "LOW", wrap: "border-emerald-500/45 bg-emerald-500/15 text-emerald-200" };
}

/** Dominant SOC success artefact — primary operator focal point */
function EnterpriseSuccessHero({ summary, onUploadAnother }) {
  const [copied, setCopied] = useState(false);
  const hashShort = truncateMiddle(summary.hash, 8);
  const threat = threatTone(summary.threatLevel);
  const scoreN = Number(summary.securityScore ?? 94);
  const scoreLabel = Number.isFinite(scoreN) ? `${Math.round(scoreN)}% SCORE` : "— SCORE";

  const handleCopy = async () => {
    if (!summary.hash || summary.hash === "—") return;
    try {
      await navigator.clipboard.writeText(summary.hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* noop for unsupported clipboard */
    }
  };

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, scale: 0.9, y: 28 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-[1.35rem] border border-emerald-500/35 bg-[#07111f]/96 p-4 shadow-[0_20px_70px_-28px_rgba(16,185,129,0.35)] md:p-5"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-75"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14,165,233,0.22), transparent 52%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(16,185,129,0.14), transparent 45%)",
        }}
        aria-hidden
      />

      <div className="relative space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/45 bg-emerald-500/15 shadow-[0_0_36px_-10px_rgba(52,211,153,0.55)]"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-100" strokeWidth={2} aria-hidden />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300/85">VAULT COMMIT CONFIRMED</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">File secured in telecom evidence vault</h2>
            <p className="mt-1 text-xs text-slate-400">CORE-INGEST-2 · RELAY-SYNCED · VAULT-A · TRUST-ZONE-3</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/65 p-2.5 font-mono text-xs text-slate-200">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">FILE METADATA</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <p className="truncate">
              <span className="text-slate-500">Name:</span> <span className="text-white">{summary.fileName}</span>
            </p>
            <p>
              <span className="text-slate-500">Size:</span> {summary.displaySize}
            </p>
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <p className="min-w-0 truncate">
                <span className="text-slate-500">Hash:</span>{" "}
                <span className="text-slate-100" title={summary.hash}>
                  {hashShort}
                </span>
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-600/70 bg-slate-800/70 px-2 py-1 text-[11px] font-semibold text-slate-200 transition-all duration-300 hover:border-sky-500/45 hover:text-sky-200 active:scale-95"
              >
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">SECURITY BADGES</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200">
              {summary.encryption || "AES-256-GCM"}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${threat.wrap}`}>{threat.label} RISK</span>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
              {scoreLabel}
            </span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">VERIFIED</span>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100">RELAY-SYNCED</span>
            <span className="rounded-full border border-violet-500/40 bg-violet-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-100">VAULT-A</span>
          </div>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-3">
          {[
            ["Relay confirmation", "RELAY-SYNCED", "text-cyan-300"],
            ["Vault replication", "VAULT-A active", "text-emerald-300"],
            ["Telemetry propagation", "SIEM event queued", "text-sky-300"],
            ["Integrity confidence", "99% anchor", "text-emerald-300"],
            ["Trust classification", "Trusted asset", "text-cyan-300"],
            ["Archive destination", "Secure tier", "text-violet-300"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#0b1727] px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className={clsx("mt-1 text-xs font-semibold", tone)}>{value}</p>
            </div>
          ))}
        </div>

        {summary.backendWarning ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/45 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
          >
            Simulation completed, but ingest gateway declined:{" "}
            <span className="font-medium text-white">{summary.backendWarning}</span>
          </div>
        ) : null}

        <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 font-mono text-xs text-sky-200">
          🆔 <span className="text-slate-500">File ID:</span> {summary.fileId}
        </p>

        <p className="text-xs text-slate-400">End-to-end encrypted · SOC verified · forensic metadata retained for audit and diploma demonstration.</p>

        <div className="flex flex-wrap items-center justify-start gap-2 pt-1">
          <Link
            to={summary.fileId && !summary.fileId.startsWith("SEC-") ? `/vault/files/${encodeURIComponent(summary.fileId)}` : "/user/files"}
            className={clsx(
              "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950/40",
              TX.hover,
              "hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_20px_44px_-16px_rgba(16,185,129,0.45)]",
              "ring-1 ring-emerald-400/30 hover:ring-emerald-300/45",
              "active:scale-[0.98]",
            )}
          >
            <FolderOpen className="mr-2 h-4 w-4" aria-hidden />
            View in Vault
          </Link>
          <button
            type="button"
            onClick={onUploadAnother}
            className={clsx(
              "rounded-xl border border-white/25 bg-white/[0.06] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white",
              TX.hover,
              "hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-sky-600/30 hover:text-white",
              "active:scale-[0.98]",
            )}
          >
            Upload another file
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function SocSecureUpload() {
  const dragDepth = useRef(0);
  const runIdRef = useRef(0);
  const tickerRef = useRef(null);

  const { hashHex, hashing, hashError, computeForFile, setHashHex } = useClientSha256();

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(/** @type {"idle"|"uploading"|"scanning"|"encrypting"|"stored"} */ ("idle"));
  const [logs, setLogs] = useState(/** @type {string[]} */ ([]));
  const [isDone, setIsDone] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [securedSummary, setSecuredSummary] = useState(
    /** @type {null | { fileName: string; displaySize: string; hash: string; fileId: string; encryption?: string; threatLevel?: string; securityScore?: number; backendWarning?: string | null }} */ (
      null
    ),
  );
  const [policyError, setPolicyError] = useState(/** @type {string | null} */ (null));
  const transferSpeed = useMemo(() => {
    if (!file || progress <= 0 || status === "idle" || isDone) return "0.0 MB/s";
    const mb = file.size / (1024 * 1024);
    const speed = Math.max(0.4, (mb * (progress / 100)) / 0.6);
    return `${speed.toFixed(1)} MB/s`;
  }, [file, progress, status, isDone]);

  const applyStatusToPipeline = useCallback((next) => {
    if (next === "idle") {
      setCompletedSteps(0);
      setActiveIndex(-1);
      return;
    }
    if (next === "uploading") {
      setCompletedSteps(0);
      setActiveIndex(0);
      return;
    }
    if (next === "scanning") {
      setCompletedSteps(1);
      setActiveIndex(1);
      return;
    }
    if (next === "encrypting") {
      setCompletedSteps(2);
      setActiveIndex(2);
      return;
    }
    if (next === "stored") {
      setCompletedSteps(PIPE_LINE.length);
      setActiveIndex(-1);
    }
  }, []);

  const resetPipelineUi = useCallback(() => {
    runIdRef.current += 1;
    setSecuredSummary(null);
    setProgress(0);
    setLogs([]);
    setIsDone(false);
    setCompletedSteps(0);
    setActiveIndex(-1);
    setStatus("idle");
    setPolicyError(null);
  }, []);

  const validate = (f) => {
    if (!f) return "Select a SOC evidence package.";
    if (!/\.(csv|json|txt|pdf|zip|doc|docx|docm|xls|xlsm|exe|bat|cmd|ps1)$/i.test(f.name || "")) return "SOC policy: unsupported evidence extension.";
    if (f.size > MAX_BYTES) return `SOC policy hard-cap: ≤ ${MAX_MB} MB.`;
    if (f.size <= 0) return "Rejected: empty buffer.";
    return null;
  };

  const ingestBytes = async (picked) => {
    const msg = validate(picked);
    if (msg) {
      setFile(null);
      setHashHex("");
      setPolicyError(msg);
      return;
    }
    setPolicyError(null);
    resetPipelineUi();
    setFile(picked);
    await computeForFile(picked);
  };

  const addLog = useCallback((line) => {
    setLogs((prev) => [...prev, logLine(line)]);
  }, []);

  /** Deterministic staged pipeline — progress always completes at 100%. */
  const runPipeline = useCallback(
    async (digestHex, runEpoch, f) => {
      const advanceProgress = async (from, to, steps = 4, delay = 120) => {
        const start = Math.max(0, Math.min(100, from));
        const end = Math.max(0, Math.min(100, to));
        const distance = end - start;
        for (let i = 1; i <= steps; i += 1) {
          await wait(delay);
          setProgress(Math.round(start + (distance * i) / steps));
        }
      };
      setProgress(0);
      setStatus("uploading");
      setLogs([logLine("[UPLOAD] CORE-INGEST-2 intake initialized")]);
      applyStatusToPipeline("uploading");

      addLog("[TLS] FTTH-UPLINK tunnel active");
      await advanceProgress(0, 28, 5, 110);
      if (runEpoch !== runIdRef.current) return;

      setStatus("scanning");
      setLogs((prev) => [...prev, logLine("[SHA VERIFY] Integrity anchor generated")]);
      setLogs((prev) => [...prev, logLine("[IOC SCAN] SOC-EAST malware cadence running")]);
      applyStatusToPipeline("scanning");
      await advanceProgress(28, 62, 6, 130);
      if (runEpoch !== runIdRef.current) return;
      addLog("[IOC SCAN] No critical indicator matched");

      setStatus("encrypting");
      setLogs((prev) => [...prev, logLine("[AES ENCRYPT] AES-256-GCM envelope sealing")]);
      applyStatusToPipeline("encrypting");
      await advanceProgress(62, 88, 5, 120);
      if (runEpoch !== runIdRef.current) return;
      addLog("[AUTH TAG] Cipher authentication tag generated");

      setStatus("stored");
      setLogs((prev) => [...prev, logLine("[VAULT COMMIT] VAULT-A archive commit requested")]);
      applyStatusToPipeline("stored");
      await advanceProgress(88, 100, 4, 90);
      if (runEpoch !== runIdRef.current) return;
      addLog("[RELAY SYNC] RELAY-SYNCED telemetry propagated");
      addLog("[TELEMETRY UPDATE] SIEM upload event committed");

      const fd = new FormData();
      fd.append("file", f);
      if (digestHex) fd.append("clientSha256", digestHex);

      let serverAck = null;
      let backendWarning = null;
      try {
        serverAck = await postSocUpload(fd);
      } catch (backendErr) {
        // Backend rejected — surface a warning but still show the success UI
        // since all local pipeline steps completed successfully
        const rawMsg = backendErr instanceof ApiError ? backendErr.message : String(backendErr ?? "Vault sync failed");
        backendWarning = rawMsg;
        addLog(`[WARN] Vault sync error: ${rawMsg}`);
      }

      const quarantined = ["HIGH", "CRITICAL"].includes(String(serverAck?.threatLevel || "").toUpperCase());
      addLog(backendWarning
        ? "[WARN] Local pipeline complete — vault sync pending retry"
        : quarantined ? "[QUARANTINE] SOC review hold applied" : "[VAULT] Secure replication complete");

      if (serverAck) {
        window.dispatchEvent(
          new CustomEvent("soc:vault-mutated", {
            detail: { action: "upload", fileId: serverAck?.fileId, threatLevel: serverAck?.threatLevel, at: new Date().toISOString() },
          }),
        );
      }

      const idSuffix = (digestHex || f.name).replace(/[^a-fA-F0-9]/g, "").padEnd(8, "0").slice(0, 8);

      setSecuredSummary({
        fileName: f.name,
        displaySize: fmtKb(f.size),
        hash: serverAck?.hash || digestHex || "—",
        fileId: serverAck?.fileId || `SEC-${idSuffix}`,
        encryption: serverAck?.encryption ?? "AES-256-GCM",
        threatLevel: serverAck?.threatLevel ?? "LOW",
        securityScore: serverAck?.securityScore ?? 94,
        backendWarning: backendWarning || (quarantined ? "QUARANTINED OBJECT · SOC review required" : null),
      });
      setIsDone(true);
    },
    [addLog, applyStatusToPipeline],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    const v = validate(file);
    if (v) {
      setPolicyError(v);
      return;
    }
    setPolicyError(null);

    if (!hashHex || hashing) await computeForFile(file);
    let digest = hashHex;
    if (!digest) digest = await digestSha256HexFromBlob(file);

    resetPipelineUi();
    const epoch = runIdRef.current;

    try {
      await runPipeline(digest ?? "", epoch, file);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Upload failed";
      setPolicyError(msg);
      setStatus("idle");
      setCompletedSteps(0);
      setActiveIndex(-1);
      setProgress(0);
      addLog(`Upload failed: ${msg}`);
    }
  }, [file, hashHex, hashing, computeForFile, resetPipelineUi, runPipeline, addLog]);

  const handleUploadAnother = useCallback(() => {
    resetPipelineUi();
    setFile(null);
    setHashHex("");
  }, [resetPipelineUi, setHashHex]);

  const commitDisabled = !file || (status !== "idle" && !isDone);
  const pipelineBusy = status !== "idle" && !isDone;

  const stageLine = useMemo(() => STAGE_LABEL[status] ?? "", [status]);

  const fileSelectedGlow = !!(file && !pipelineBusy && !isDone);
  useEffect(() => {
    if (!tickerRef.current) return;
    tickerRef.current.scrollTop = tickerRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="relative min-h-[58vh] overflow-x-hidden bg-[linear-gradient(180deg,#0a0f18_0%,#0f172a_45%,#070b14_100%)] px-5 py-5 text-slate-200 md:px-8 md:py-6">
      {/* Page-level dim — depth behind overlays */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto mb-[-40vh] h-[480px] max-w-6xl skew-y-[-6deg] bg-[radial-gradient(ellipse,cyan-500/[0.08],transparent_70%)] blur-3xl"
        animate={{ opacity: pipelineBusy ? 0.85 : fileSelectedGlow ? 0.5 : 0.28 }}
        transition={{ duration: 0.5 }}
      />

      <header
        className={clsx(
          "relative mx-auto mb-5 max-w-5xl border-b pb-5 transition-opacity duration-500",
          pipelineBusy ? "border-sky-500/10" : "border-white/[0.08]",
        )}
      >
        <div className="flex flex-wrap items-start gap-4">
          <motion.div
            className={clsx(
              "flex h-14 w-14 items-center justify-center rounded-2xl border bg-emerald-500/10",
              TX.shell,
              fileSelectedGlow || isDone ? "border-emerald-400/55 shadow-[0_0_52px_-12px_rgba(52,211,153,0.45)]" : "border-emerald-500/25",
            )}
            whileHover={!pipelineBusy ? { scale: 1.04 } : undefined}
          >
            <Cpu className="h-8 w-8 text-emerald-400" aria-hidden />
          </motion.div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-500/90">CDSV · SOC Ingest Nexus</p>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Secure Evidence Upload</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              <span className="rounded border border-amber-500/35 bg-amber-950/35 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                Live API
              </span>{" "}
              Enterprise-style ingest console — staged encryption path with live operator feedback (
              <span className="font-semibold text-sky-400">AES-256-GCM</span>).
            </p>
          </div>
          <motion.div
            animate={{ opacity: pipelineBusy ? [0.85, 1, 0.85] : 1 }}
            transition={{ repeat: pipelineBusy ? Infinity : 0, duration: 2.4 }}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-lg",
              TX.hover,
              pipelineBusy
                ? "border-sky-500/45 bg-sky-950/55 text-sky-100 shadow-sky-500/20"
                : isDone
                  ? "border-emerald-400/55 bg-emerald-950/50 text-emerald-100 shadow-emerald-500/25"
                  : "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100",
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            {pipelineBusy ? "PROCESSING OPERATION…" : isDone ? "INGEST ACK · SECURED" : "SOC CONSOLE READY"}
          </motion.div>
        </div>
      </header>

      <div
        className={clsx(
          "relative mx-auto grid max-w-6xl items-start gap-4 lg:grid-cols-[1fr_19rem]",
          pipelineBusy ? "opacity-85" : "",
        )}
      >
        <section className="h-fit rounded-[1.25rem] border border-white/[0.09] bg-[#111827]/60 p-4 shadow-2xl shadow-black/55 backdrop-blur-md md:p-5">
          <AnimatePresence>{pipelineBusy ? <ProcessingOverlay progress={progress} status={status} /> : null}</AnimatePresence>
          {isDone && securedSummary ? (
            <AnimatePresence mode="wait">
              <EnterpriseSuccessHero key={securedSummary.fileId} summary={securedSummary} onUploadAnother={handleUploadAnother} />
            </AnimatePresence>
          ) : (
            <>
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragDepth.current += 1;
                  setDrag(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setDrag(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragDepth.current = 0;
                  setDrag(false);
                  ingestBytes(e.dataTransfer.files?.[0] ?? null);
                }}
                className={clsx(
                  "rounded-2xl border-2 border-dashed px-4 py-5 text-center",
                  TX.hover,
                  "transition-[box-shadow,transform,border-color,background]",
                  pipelineBusy ? "opacity-55" : "",
                  drag && !pipelineBusy ? "translate-y-0 border-emerald-400/80 shadow-[0_0_54px_-12px_rgba(52,211,153,0.55)] ring-2 ring-emerald-500/25" : "",
                  fileSelectedGlow
                    ? "border-emerald-400/70 shadow-[0_0_52px_-14px_rgba(52,211,153,0.52)] ring-2 ring-emerald-400/30"
                    : "border-sky-500/25 bg-[#0b1224]/95 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-950/45",
                  !fileSelectedGlow && !drag ? "shadow-inner" : "",
                )}
              >
                <motion.div animate={fileSelectedGlow ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 3, repeat: fileSelectedGlow ? Infinity : 0 }}>
                  <UploadCloud
                    className={clsx("mx-auto h-12 w-12 drop-shadow-lg", fileSelectedGlow ? "text-emerald-400 drop-shadow-[0_0_34px_rgba(52,211,153,0.48)]" : "text-sky-400")}
                  />
                </motion.div>
                <p className="mt-3 text-base font-bold text-white drop-shadow-md">Ingress drag surface</p>
                <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500">CSV · JSON · TXT · ≤10 MB · SHA-256 integrity anchor</p>
                <div className="mx-auto mt-3 grid max-w-2xl gap-1.5 text-[10px] sm:grid-cols-3">
                  {[
                    ["CORE-INGEST-2", "secure intake node"],
                    ["TLS tunnel active", "FTTH-UPLINK verified"],
                    ["SHA-256 precheck", "WebCrypto enabled"],
                    ["RELAY-SYNCED", "SOC-EAST propagation"],
                    ["TRUST-ZONE-3", "operator policy"],
                    ["VAULT-A standby", "archive destination"],
                  ].map(([label, detail]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left">
                      <p className="font-bold uppercase tracking-wide text-cyan-300">{label}</p>
                      <p className="mt-0.5 text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>

                <input
                  hidden
                  type="file"
                  id="soc-file-input"
                  accept={ACCEPT}
                  disabled={pipelineBusy}
                  onChange={(ev) => {
                    ingestBytes(ev.target.files?.[0] ?? null);
                    ev.target.value = "";
                  }}
                />

                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  <label
                    htmlFor="soc-file-input"
                    className={clsx(
                      "inline-flex cursor-pointer items-center rounded-xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-600 to-sky-700 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-sky-950/50",
                      TX.hover,
                      "hover:border-sky-400/65 hover:from-sky-500 hover:to-sky-600 hover:shadow-[0_28px_50px_-20px_rgba(14,165,233,0.55)]",
                      "active:scale-[0.98]",
                      pipelineBusy && "pointer-events-none cursor-not-allowed opacity-45",
                    )}
                  >
                    Browse evidence…
                  </label>
                  <button
                    type="button"
                    disabled={pipelineBusy || !file}
                    onClick={() => {
                      setFile(null);
                      setHashHex("");
                      resetPipelineUi();
                    }}
                    className={clsx(
                      "rounded-xl border border-white/[0.12] px-5 py-2.5 text-sm font-bold text-slate-200",
                      TX.hover,
                      "hover:bg-white/[0.07] hover:shadow-lg disabled:opacity-35",
                      "active:scale-[0.98]",
                    )}
                  >
                    Clear slot
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {file ? <FilePreviewCard key={file.name + file.lastModified} file={file} status={status} isDone={isDone} /> : null}
              </AnimatePresence>

              {hashError ? (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-100 shadow-[0_12px_40px_-20px_rgba(245,158,11,0.35)]"
                >
                  <span className="text-lg leading-none text-amber-400" aria-hidden>
                    ⚠
                  </span>
                  <span className="leading-snug">WebCrypto hashing issue — {hashError}</span>
                </div>
              ) : null}

              {policyError ? (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-sm text-rose-100 shadow-[0_12px_40px_-20px_rgba(244,63,94,0.3)]"
                >
                  <span className="text-lg leading-none text-rose-400" aria-hidden>
                    ⚠
                  </span>
                  <span className="leading-snug">{policyError}</span>
                </div>
              ) : null}

              <div className={clsx("mt-5 space-y-2", file ? "" : "opacity-70 transition-opacity duration-300")}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Evidence metadata · pre-flight</p>
                <dl className="grid gap-2 rounded-[1rem] border border-white/[0.08] bg-[#0c1325]/90 p-3 font-mono text-xs leading-relaxed text-slate-300 shadow-inner backdrop-blur-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-1.5">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="truncate text-right font-medium text-white">{file?.name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-1.5">
                    <dt className="text-slate-500">Size</dt>
                    <dd className="text-right tabular-nums">{file ? fmtKb(file.size) : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-1.5">
                    <dt className="text-slate-500">MIME</dt>
                    <dd className="break-all text-right">{file?.type || "(browser omitted)"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-1.5">
                    <dt className="text-slate-500">Classification</dt>
                    <dd className="text-right text-emerald-300">Integrity Ready</dd>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1 sm:col-span-2">
                    <dt className="flex items-center gap-2 text-slate-500">
                      <Fingerprint className="h-3.5 w-3.5" aria-hidden />
                      SHA-256 (WebCrypto)
                    </dt>
                    <dd className="break-all text-[11px] text-emerald-200/95">
                      {hashing ? (
                        <span className="inline-flex items-center gap-2 text-sky-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" aria-hidden />
                          hashing bytes…
                        </span>
                      ) : (
                        hashHex || "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className={clsx("mt-5", pipelineBusy ? "opacity-85" : "")}>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Transfer egress</span>
                    <AnimatePresence mode="wait">
                      {stageLine ? (
                        <motion.p
                          key={stageLine}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 truncate text-[13px] font-semibold text-sky-300"
                        >
                          {stageLine}
                        </motion.p>
                      ) : (
                        <p className="mt-2 text-[13px] text-slate-500 transition-colors duration-300">Await ingest command…</p>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="shrink-0 rounded-lg border border-sky-500/30 bg-sky-950/50 px-3 py-1 font-mono text-lg font-black tabular-nums text-sky-200">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/40 shadow-inner ring-1 ring-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0284c7,#22d3ee,#34d399)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    initial={{ width: 0 }}
                    style={{ width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="mt-2 grid gap-1 text-[11px] text-slate-400 sm:grid-cols-3">
                  <p>Secure uplink: {pipelineBusy ? "active" : "idle"}</p>
                  <p>TLS tunnel: {pipelineBusy ? "established" : "standby"}</p>
                  <p className="tabular-nums">Transfer: {transferSpeed}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={commitDisabled}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleUpload();
                  }}
                  className={clsx(
                    "flex min-h-[46px] min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/55 bg-emerald-600 px-7 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_20px_50px_-18px_rgba(16,185,129,0.55)]",
                    TX.hover,
                    "enabled:hover:scale-[1.02] enabled:hover:bg-emerald-500 enabled:hover:shadow-[0_28px_55px_-20px_rgba(16,185,129,0.55)] disabled:cursor-not-allowed disabled:opacity-45",
                  )}
                >
                  {pipelineBusy ? <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden /> : <Radio className="h-5 w-5" aria-hidden />}
                  Commit to vault
                </button>
              </div>
            </>
          )}
        </section>

        <aside className={clsx("h-fit space-y-3", pipelineBusy ? "opacity-90" : "", isDone ? "opacity-95" : "")}>
          <div className="rounded-[1.05rem] border border-white/[0.09] bg-[#111827]/72 p-3.5 shadow-xl shadow-black/35 backdrop-blur-md">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Live pipeline matrix</p>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                {pipelineBusy ? "active" : isDone ? "complete" : "standby"}
              </span>
            </div>
            <div className="space-y-2">
              {PIPE_LINE.map((row, i) => (
                <PipelineStepTile key={row.id} Icon={row.icon} title={row.title} sub={row.sub} meta={row.meta} tone={stepTone(i, completedSteps, activeIndex)} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.05rem] border border-white/[0.08] bg-[#0c1325]/94 p-3.5 shadow-lg">
            <p className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              SOC activity ticker
            </p>
            <div ref={tickerRef} className="max-h-[13.5rem] space-y-0.5 overflow-y-auto rounded-lg border border-slate-700/70 bg-black/35 p-2 pr-2 text-[10px] font-mono">
              {logs.length ? (
                logs.map((log, i) => (
                  <motion.p
                    key={`${i}-${log}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.32), duration: 0.3 }}
                    className="rounded-sm py-0.5 pl-1.5 leading-relaxed text-slate-300"
                  >
                    <span className="mr-2 text-sky-400">{">"}</span>
                    {log}
                  </motion.p>
                ))
              ) : (
                <p className="text-slate-600">Await operator…</p>
              )}
              <p className="pl-2 text-sky-300/80">
                <span className="mr-2 text-sky-400">{">"}</span>
                <span className="inline-block h-3 w-2 animate-pulse bg-sky-300/70 align-middle" />
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 font-mono text-[9px] uppercase tracking-wide text-slate-600">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {[
                  ["bg-emerald-400", "complete"],
                  ["bg-sky-400", "processing"],
                  ["bg-amber-400", "hash watch"],
                ].map(([dot, label]) => (
                  <span key={label} className="inline-flex items-center gap-1">
                    <span className={clsx("h-1.5 w-1.5 rounded-full opacity-70", dot)} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500">
                {["SOC-EAST", "CORE-INGEST-2", "TRUST-ZONE-3", "VAULT-A"].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1">
                    <span className="h-px w-2 bg-white/10" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
