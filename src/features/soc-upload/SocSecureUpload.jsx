/**
 * SOC Secure File Upload — React console (Vite).
 * DEMO MODE: full pipeline simulated on-device (no backend dependency).
 */
import { useCallback, useMemo, useRef, useState } from "react";
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

import { env } from "@/config/env";
import { ApiError } from "@/services/api/apiError";
import { postSocUpload } from "@/services/api";

import { digestSha256HexFromBlob, useClientSha256 } from "./useClientSha256";

const ACCEPT = ".pdf,.csv,.docx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Blue / processing-aligned motion tokens */
const TX = {
  shell: "duration-300 ease-out",
  hover: "transition-all duration-300 ease-out",
};

/** Four operator-visible ingest phases aligned with syllabus */
const PIPE_LINE = [
  { id: "u1", icon: Wifi, title: "Uploading…", sub: "TLS channel + chunked multipart egress" },
  { id: "u2", icon: Search, title: "Scanning for threats…", sub: "Simulated IOC / heuristic pass (dwell)" },
  { id: "u3", icon: Lock, title: "Encrypting file…", sub: "AES-256-GCM envelope (fresh IV)" },
  { id: "u4", icon: Server, title: "Stored securely", sub: "Ciphertext anchored in guarded vault tier" },
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

function PipelineStepTile({ Icon, title, sub, tone }) {
  const ready = tone === "done";
  const live = tone === "active";

  return (
    <div
      className={clsx(
        "flex gap-4 rounded-xl border px-4 py-3 backdrop-blur-sm",
        TX.hover,
        "hover:shadow-md",
        ready && "border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_8px_30px_-12px_rgba(16,185,129,0.25)]",
        live && "border-sky-500/50 bg-sky-500/[0.1] shadow-[0_0_28px_-6px_rgba(56,189,248,0.5)] ring-1 ring-sky-500/20",
        !ready && !live && "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]",
      )}
    >
      <div
        className={clsx(
          "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300",
          ready && "border-emerald-500/45 bg-emerald-500/12 text-emerald-300",
          live && "border-sky-500/55 bg-sky-500/12 text-sky-300",
          !ready && !live && "border-white/10 bg-[#111827]/80 text-slate-500",
        )}
      >
        {ready ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
        ) : live ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Circle className="h-5 w-5 opacity-35" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-slate-100">
          <Icon className={clsx("h-4 w-4", ready ? "text-emerald-400" : live ? "text-sky-400" : "text-slate-600")} aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
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
      className="mt-6 rounded-2xl border border-slate-600/55 bg-gradient-to-br from-slate-900/85 to-[#0c1629]/95 p-5 text-left shadow-[0_16px_48px_-24px_rgba(2,132,199,0.35)] ring-1 ring-slate-500/20 transition-all duration-300 hover:border-sky-500/40 hover:shadow-[0_20px_52px_-24px_rgba(2,132,199,0.45)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/12 text-sky-200 shadow-inner">
          <FileText className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate font-mono text-sm font-bold text-white">📄 {file.name}</p>
            <span className={clsx("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", statusClass)}>
              {statusLabel}
            </span>
          </div>
          <div className="grid gap-1.5 font-mono text-[11px] text-slate-400">
            <p>
              <span className="text-slate-500">Size:</span> <span className="text-slate-200">{fmtKb(file.size)}</span>
            </p>
            <p>
              <span className="text-slate-500">Type:</span> <span className="text-slate-200">{fileTypeLabel(file)}</span>
            </p>
            <p>
              <span className="text-slate-500">Status:</span>{" "}
              <span className="font-semibold text-emerald-300">Ready</span>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-600/40 pt-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-55" aria-hidden />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" aria-hidden />
        </span>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">READY TO UPLOAD</p>
      </div>
    </motion.div>
  );
}

/** Full-viewport SOC processing gate */
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
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/78 p-6 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-[28rem] overflow-hidden rounded-[1.65rem] border-2 border-sky-500/45 bg-[#0b1428]/92 p-10 shadow-[0_32px_100px_-20px_rgba(14,165,233,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] ring-4 ring-sky-500/10"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(56,189,248,0.22),transparent_55%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.12),transparent_58%)]" aria-hidden />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-500/40 bg-sky-500/15 shadow-[0_0_60px_-10px_rgba(56,189,248,0.65)]">
            <span className="absolute inset-0 animate-ping rounded-3xl border border-sky-300/45" aria-hidden />
            <Loader2 className="h-11 w-11 animate-spin text-sky-300" strokeWidth={2} aria-hidden />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-sky-400/90">SOC SECURE PROCESSING</p>
          <h2 className="mt-3 font-mono text-lg font-black uppercase tracking-[0.15em] text-white drop-shadow-lg md:text-xl">SECURE PROCESSING</h2>
          <p className="mt-2 text-xs text-sky-100/80">Applying encryption and threat analysis...</p>

          <ul className="mt-10 w-full space-y-3 border-y border-white/[0.08] py-8 text-sm">
            <li
              className={clsx(
                "rounded-lg px-3 py-2 font-medium transition-colors duration-300",
                status === "uploading" ? "bg-sky-500/20 text-sky-100" : progress >= 50 ? "text-emerald-500/95" : "text-slate-500",
              )}
            >
              {progress >= 50 ? "✓ " : ""}Uploading…
            </li>
            <li
              className={clsx(
                "rounded-lg px-3 py-2 font-medium transition-colors duration-300",
                status === "scanning" ? "bg-sky-500/20 text-sky-100" : progress >= 75 ? "text-emerald-500/95" : "text-slate-500",
              )}
            >
              {progress >= 75 ? "✓ " : ""}Scanning…
            </li>
            <li
              className={clsx(
                "rounded-lg px-3 py-2 font-medium transition-colors duration-300",
                status === "encrypting" ? "bg-sky-500/20 text-sky-100" : progress >= 100 ? "text-emerald-500/95" : "text-slate-500",
              )}
            >
              {progress >= 100 ? "✓ " : ""}Encrypting…
            </li>
          </ul>

          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-sky-200/95">{stage}</p>

          <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Pipeline</span>
              <span className="tabular-nums text-sky-400">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#38bdf8,#34d399)] shadow-[0_0_28px_-4px_rgba(52,211,153,0.55)]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <p className="mt-8 font-mono text-[10px] text-slate-500">Evidence never leaves ciphertext policy enclave · demo ingest</p>
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
  const hashShort = truncateMiddle(summary.hash, 12);
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
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[1.45rem] border border-emerald-500/35 bg-[#07111f]/96 p-6 shadow-[0_20px_70px_-26px_rgba(16,185,129,0.4)] md:p-8"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-75"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14,165,233,0.22), transparent 52%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(16,185,129,0.14), transparent 45%)",
        }}
        aria-hidden
      />

      <div className="relative space-y-5">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/45 bg-emerald-500/15 shadow-[0_0_42px_-8px_rgba(52,211,153,0.6)]"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-100" strokeWidth={2} aria-hidden />
        </motion.div>

        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-300/85">HEADER</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">✔ FILE SECURED</h2>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/65 p-4 font-mono text-sm text-slate-200">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">FILE INFO CARD</p>
          <div className="space-y-2">
            <p className="truncate">
              <span className="text-slate-500">Name:</span> <span className="text-white">{summary.fileName}</span>
            </p>
            <p>
              <span className="text-slate-500">Size:</span> {summary.displaySize}
            </p>
            <div className="flex items-center justify-between gap-2">
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">SECURITY BADGES</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-500/45 bg-sky-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200">
              {summary.encryption || "AES-256-GCM"}
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${threat.wrap}`}>{threat.label} RISK</span>
            <span className="rounded-full border border-amber-500/45 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-100">
              {scoreLabel}
            </span>
            <span className="rounded-full border border-emerald-500/45 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">VERIFIED</span>
          </div>
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

        <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 font-mono text-xs text-sky-200">
          🆔 <span className="text-slate-500">File ID:</span> {summary.fileId}
        </p>

        <p className="text-center text-xs text-slate-400">End-to-end encrypted • SOC verified</p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onUploadAnother}
            className={clsx(
              "rounded-xl border border-white/25 bg-white/[0.06] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white",
              TX.hover,
              "hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-sky-600/30 hover:text-white",
              "active:scale-[0.98]",
            )}
          >
            Upload another file
          </button>
          <Link
            to="/user/files"
            className={clsx(
              "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950/40",
              TX.hover,
              "hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_20px_44px_-16px_rgba(16,185,129,0.45)]",
              "ring-1 ring-emerald-400/30 hover:ring-emerald-300/45",
              "active:scale-[0.98]",
            )}
          >
            <FolderOpen className="mr-2 h-4 w-4" aria-hidden />
            View in Vault
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function SocSecureUpload() {
  const dragDepth = useRef(0);
  const runIdRef = useRef(0);

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
    if (!/\.(pdf|csv|docx)$/i.test(f.name || "")) return "SOC policy: PDF, DOCX, or CSV ingests only.";
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
      setProgress(0);
      setStatus("uploading");
      setLogs([logLine("Upload started")]);
      applyStatusToPipeline("uploading");

      await wait(800);
      if (runEpoch !== runIdRef.current) return;
      setProgress(25);

      setStatus("scanning");
      setLogs((prev) => [...prev, logLine("Scanning...")]);
      applyStatusToPipeline("scanning");
      await wait(800);
      if (runEpoch !== runIdRef.current) return;
      setProgress(50);
      addLog("Scan complete");

      setStatus("encrypting");
      setLogs((prev) => [...prev, logLine("Encrypting with AES-256-GCM...")]);
      applyStatusToPipeline("encrypting");
      await wait(800);
      if (runEpoch !== runIdRef.current) return;
      setProgress(75);
      addLog("Encryption complete");

      setStatus("stored");
      setLogs((prev) => [...prev, logLine("Stored in secure vault")]);
      applyStatusToPipeline("stored");
      await wait(500);
      if (runEpoch !== runIdRef.current) return;
      setProgress(100);
      addLog("Stored");

      /** @type {{ fileId: string, hash: string, encryption: string, threatLevel: string, securityScore: number } | null} */
      let serverAck = null;
      let backendWarning = /** @type {string | null} */ (null);
      if (!env.useMockApi) {
        try {
          const fd = new FormData();
          fd.append("file", f);
          if (digestHex) fd.append("clientSha256", digestHex);
          serverAck = await postSocUpload(fd);
        } catch (e) {
          backendWarning = e instanceof ApiError ? e.message : "Gateway rejected ingest";
          addLog(`Backend: ${backendWarning}`);
        }
      }

      const idSuffix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10);

      setSecuredSummary({
        fileName: f.name,
        displaySize: fmtKb(f.size),
        hash: serverAck?.hash || digestHex || "—",
        fileId: serverAck?.fileId || `SEC-${idSuffix}`,
        encryption: serverAck?.encryption ?? "AES-256-GCM",
        threatLevel: serverAck?.threatLevel ?? "LOW",
        securityScore: serverAck?.securityScore ?? 94,
        backendWarning,
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

    await runPipeline(digest ?? "", epoch, file);
  }, [file, hashHex, hashing, computeForFile, resetPipelineUi, runPipeline]);

  const handleUploadAnother = useCallback(() => {
    resetPipelineUi();
    setFile(null);
    setHashHex("");
  }, [resetPipelineUi, setHashHex]);

  const commitDisabled = !file || (status !== "idle" && !isDone);
  const pipelineBusy = status !== "idle" && !isDone;

  const stageLine = useMemo(() => STAGE_LABEL[status] ?? "", [status]);

  const fileSelectedGlow = !!(file && !pipelineBusy && !isDone);

  return (
    <div className="relative min-h-[60vh] overflow-x-hidden bg-[linear-gradient(180deg,#0a0f18_0%,#0f172a_45%,#070b14_100%)] px-5 py-8 text-slate-200 md:px-10 md:py-12">
      {/* Page-level dim — depth behind overlays */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto mb-[-40vh] h-[480px] max-w-6xl skew-y-[-6deg] bg-[radial-gradient(ellipse,cyan-500/[0.08],transparent_70%)] blur-3xl"
        animate={{ opacity: pipelineBusy ? 0.85 : fileSelectedGlow ? 0.5 : 0.28 }}
        transition={{ duration: 0.5 }}
      />

      <AnimatePresence>{pipelineBusy ? <ProcessingOverlay progress={progress} status={status} /> : null}</AnimatePresence>

      <header
        className={clsx(
          "relative mx-auto mb-10 max-w-5xl border-b pb-8 transition-opacity duration-500",
          pipelineBusy ? "pointer-events-none border-white/[0.04] opacity-35" : "border-white/[0.08]",
        )}
      >
        <div className="flex flex-wrap items-start gap-6">
          <motion.div
            className={clsx(
              "flex h-16 w-16 items-center justify-center rounded-2xl border bg-emerald-500/10",
              TX.shell,
              fileSelectedGlow || isDone ? "border-emerald-400/55 shadow-[0_0_52px_-12px_rgba(52,211,153,0.45)]" : "border-emerald-500/25",
            )}
            whileHover={!pipelineBusy ? { scale: 1.04 } : undefined}
          >
            <Cpu className="h-9 w-9 text-emerald-400" aria-hidden />
          </motion.div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500/90">CDSV · SOC Ingest Nexus</p>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-[2.1rem]">Secure Evidence Upload</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              <span className="rounded border border-amber-500/35 bg-amber-950/35 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                {env.useMockApi ? "Demo" : "Live API"}
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
          "relative mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_22rem]",
          pipelineBusy ? "opacity-85" : "",
        )}
      >
        <section className="rounded-[1.35rem] border border-white/[0.09] bg-[#111827]/60 p-6 shadow-2xl shadow-black/55 backdrop-blur-md md:p-8">
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
                  "rounded-2xl border-2 border-dashed px-6 py-14 text-center",
                  TX.hover,
                  "transition-[box-shadow,transform,border-color,background]",
                  pipelineBusy ? "opacity-55" : "",
                  drag && !pipelineBusy ? "translate-y-0 border-emerald-400/70 shadow-[0_0_54px_-12px_rgba(52,211,153,0.55)] ring-4 ring-emerald-500/20" : "",
                  fileSelectedGlow
                    ? "border-emerald-400/70 shadow-[0_0_52px_-14px_rgba(52,211,153,0.52)] ring-2 ring-emerald-400/30"
                    : "border-sky-500/25 bg-[#0b1224]/95 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-950/45",
                  !fileSelectedGlow && !drag ? "shadow-inner" : "",
                )}
              >
                <motion.div animate={fileSelectedGlow ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 3, repeat: fileSelectedGlow ? Infinity : 0 }}>
                  <UploadCloud
                    className={clsx("mx-auto h-14 w-14 drop-shadow-lg", fileSelectedGlow ? "text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.55)]" : "text-sky-400")}
                  />
                </motion.div>
                <p className="mt-5 text-lg font-bold text-white drop-shadow-md">Ingress drag surface</p>
                <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500">PDF · DOCX · CSV · ≤10 MB · enterprise hash anchor</p>

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

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <label
                    htmlFor="soc-file-input"
                    className={clsx(
                      "inline-flex cursor-pointer items-center rounded-xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-600 to-sky-700 px-7 py-3 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-sky-950/50",
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
                      "rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-bold text-slate-200",
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
                  className="mt-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100 shadow-[0_12px_40px_-20px_rgba(245,158,11,0.35)]"
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
                  className="mt-6 flex gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100 shadow-[0_12px_40px_-20px_rgba(244,63,94,0.3)]"
                >
                  <span className="text-lg leading-none text-rose-400" aria-hidden>
                    ⚠
                  </span>
                  <span className="leading-snug">{policyError}</span>
                </div>
              ) : null}

              <div className={clsx("mt-10 space-y-4", file ? "" : "opacity-70 transition-opacity duration-300")}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Evidence metadata · pre-flight</p>
                <dl className="grid gap-4 rounded-[1rem] border border-white/[0.08] bg-[#0c1325]/90 p-5 font-mono text-xs leading-relaxed text-slate-300 shadow-inner backdrop-blur-sm">
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="truncate text-right font-medium text-white">{file?.name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                    <dt className="text-slate-500">Size</dt>
                    <dd className="text-right tabular-nums">{file ? fmtKb(file.size) : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                    <dt className="text-slate-500">MIME</dt>
                    <dd className="break-all text-right">{file?.type || "(browser omitted)"}</dd>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
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

              <div className={clsx("mt-10", pipelineBusy ? "opacity-85" : "")}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
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
                  <span className="shrink-0 rounded-lg border border-sky-500/30 bg-sky-950/50 px-3 py-1.5 font-mono text-xl font-black tabular-nums text-sky-200">{progress}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-black/40 shadow-inner ring-1 ring-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0284c7,#22d3ee,#34d399)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    initial={{ width: 0 }}
                    style={{ width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  type="button"
                  disabled={commitDisabled}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleUpload();
                  }}
                  className={clsx(
                    "flex min-h-[52px] min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/55 bg-emerald-600 px-8 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_20px_50px_-18px_rgba(16,185,129,0.55)]",
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

        <aside className={clsx("space-y-6", pipelineBusy ? "opacity-80" : "", isDone ? "opacity-95" : "")}>
          <div className="rounded-[1.15rem] border border-white/[0.09] bg-[#111827]/72 p-5 shadow-xl shadow-black/35 backdrop-blur-md">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Live pipeline matrix</p>
            <div className="space-y-3">
              {PIPE_LINE.map((row, i) => (
                <PipelineStepTile key={row.id} Icon={row.icon} title={row.title} sub={row.sub} tone={stepTone(i, completedSteps, activeIndex)} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-white/[0.08] bg-[#0c1325]/94 p-5 shadow-lg">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              SOC activity ticker
            </p>
            <div className="max-h-[20rem] space-y-1 overflow-y-auto rounded-lg border border-slate-700/70 bg-black/35 p-3 pr-2 text-[11px] font-mono">
              {logs.length ? (
                logs.map((log, i) => (
                  <motion.p
                    key={`${i}-${log}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.32), duration: 0.3 }}
                    className="rounded-sm py-1 pl-2 leading-relaxed text-slate-300"
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

          {!isDone ? (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-medium uppercase leading-relaxed tracking-wider text-slate-600">
              Green = complete · Sky = processing · Amber = hashing warning · Alerts surface for operator triage only.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
