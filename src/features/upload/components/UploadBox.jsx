import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, UploadCloud } from "lucide-react";
import { motion } from "motion/react";
import { uploadSingleFile } from "../api/uploadSingleFile";
import SecurityDetailsPanel from "./SecurityDetailsPanel";
import UploadSecurityPipeline from "./UploadSecurityPipeline";

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT_EXT_REGEX = /\.(pdf|csv|docx)$/i;

export function validateUploadFile(f) {
  if (!f) return "Choose a PDF, CSV, or DOCX file.";
  const name = String(f.name || "");
  if (!ACCEPT_EXT_REGEX.test(name)) return "Allowed types: PDF, CSV, DOCX.";
  if (f.size > UPLOAD_MAX_BYTES) return "Max file size is 10MB.";
  if (f.size <= 0) return "Empty files are not allowed.";
  return null;
}

function randomPipelineDelay() {
  return 500 + Math.random() * 700;
}

export default function UploadBox({ isLight = false }) {
  const dragDepthRef = useRef(0);
  const abortRef = useRef(null);
  const pipelineTimersRef = useRef([]);

  /** idle | uploading | processing | success | error */
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [transferProgress, setTransferProgress] = useState(0);
  const [pipelineDone, setPipelineDone] = useState(0);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [securityResult, setSecurityResult] = useState(null);

  const clearPipelineTimers = useCallback(() => {
    pipelineTimersRef.current.forEach((id) => window.clearTimeout(id));
    pipelineTimersRef.current = [];
  }, []);

  const resetTransient = useCallback(() => {
    setTransferProgress(0);
    setPipelineDone(0);
    setErrorMessage("");
    setSecurityResult(null);
  }, []);

  const resetAll = useCallback(() => {
    clearPipelineTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    resetTransient();
    setFile(null);
    setUploadStatus("idle");
  }, [clearPipelineTimers, resetTransient]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      pipelineTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const applySelectedFile = useCallback(
    (next) => {
      const err = validateUploadFile(next);
      if (err) {
        setErrorMessage(err);
        setFile(null);
        setUploadStatus("error");
        clearPipelineTimers();
        setPipelineDone(0);
        setTransferProgress(0);
        setSecurityResult(null);
        return;
      }
      abortRef.current?.abort();
      abortRef.current = null;
      clearPipelineTimers();
      setErrorMessage("");
      setSecurityResult(null);
      setTransferProgress(0);
      setPipelineDone(0);
      setFile(next);
      setUploadStatus("idle");
    },
    [clearPipelineTimers],
  );

  const runSequentialDelays = useCallback(() => {
    return new Promise((resolve) => {
      let next = 2;
      const tick = () => {
        if (next > 5) {
          resolve();
          return;
        }
        const id = window.setTimeout(() => {
          setPipelineDone(next);
          next += 1;
          tick();
        }, randomPipelineDelay());
        pipelineTimersRef.current.push(id);
      };
      tick();
    });
  }, []);

  const onUpload = useCallback(async () => {
    if (!file || uploadStatus === "uploading" || uploadStatus === "processing") return;
    const pre = validateUploadFile(file);
    if (pre) {
      setErrorMessage(pre);
      setUploadStatus("error");
      return;
    }

    clearPipelineTimers();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUploadStatus("uploading");
    setPipelineDone(0);
    setTransferProgress(0);
    setErrorMessage("");
    setSecurityResult(null);

    try {
      const data = await uploadSingleFile(file, {
        signal: controller.signal,
        onProgress: setTransferProgress,
      });

      if (controller.signal.aborted) return;

      if (!data?.success) {
        throw new Error(typeof data?.error === "string" ? data.error : "Upload failed.");
      }

      setSecurityResult(data);
      setTransferProgress(100);

      setUploadStatus("processing");
      setPipelineDone(1);

      await runSequentialDelays();

      if (controller.signal.aborted) return;

      setUploadStatus("success");
    } catch (e) {
      clearPipelineTimers();

      if (axiosIsCancelLike(e) || controller.signal.aborted) {
        setUploadStatus("idle");
        setTransferProgress(0);
        setPipelineDone(0);
        setErrorMessage("");
        setSecurityResult(null);
        return;
      }

      let msg = axiosErrorMessage(e) || String(e instanceof Error ? e.message : "");
      msg = normalizeClientError(msg, e?.response?.status);

      setErrorMessage(msg || "Upload failed.");
      setTransferProgress(0);
      setPipelineDone(0);
      setSecurityResult(null);
      setUploadStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [file, uploadStatus, clearPipelineTimers, runSequentialDelays]);

  const onCancelUpload = () => {
    const c = abortRef.current;
    if (!c || uploadStatus !== "uploading") return;
    c.abort();
    abortRef.current = null;
    clearPipelineTimers();
    setUploadStatus("idle");
    setTransferProgress(0);
    setPipelineDone(0);
    setErrorMessage("");
    setSecurityResult(null);
  };

  const cancelDragDepth = () => {
    dragDepthRef.current = 0;
    setDragActive(false);
  };

  const shell = isLight ? "text-slate-900" : "text-[#E5E7EB]";
  const cardOuter = isLight ? "rounded-2xl border border-slate-200 bg-white shadow-sm" : "rounded-2xl border border-white/10 bg-[#111827]";
  const zoneBase = dragActive
    ? isLight
      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/35"
      : "border-[#38BDF8] bg-[#0c1929] ring-2 ring-sky-500/35"
    : isLight
      ? "border-slate-200 bg-slate-50"
      : "border-[#3B82F6]/45 bg-[#0F172A]";

  const showPipeline = uploadStatus === "uploading" || uploadStatus === "processing" || uploadStatus === "success";
  const busy = uploadStatus === "uploading" || uploadStatus === "processing";
  const pipelinePhase = uploadStatus === "uploading" ? "uploading" : "processing";

  return (
    <div className={`mx-auto max-w-4xl rounded-2xl p-6 md:p-8 ${shell}`}>
      <div className={`p-6 md:p-8 ${cardOuter}`}>
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <motion.div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-[#38BDF8]"
            animate={busy ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: busy ? Infinity : 0, ease: "easeInOut" }}
          >
            <UploadCloud className="h-6 w-6" aria-hidden />
          </motion.div>
          <div className="min-w-0">
            <h2 className={`text-xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>Secure upload pipeline</h2>
            <p className={`mt-1 max-w-2xl text-sm ${isLight ? "text-slate-600" : "text-[#9CA3AF]"}`}>
              Files are transferred over HTTP, fingerprinted on the server, and run through a simulated SOC-style ingest (encryption · AV · heuristics · vault).
              Use <span className="font-medium">npm run dev</span> so Vite proxies to the local API on port <span className="tabular-nums">3001</span>.
            </p>
          </div>
        </div>

        <div
          role="presentation"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragDepthRef.current += 1;
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setDragActive(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelDragDepth();
            applySelectedFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${zoneBase}`}
        >
          <input
            type="file"
            accept=".pdf,.csv,.docx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            id="user-upload-native-input"
            disabled={busy}
            onChange={(ev) => {
              applySelectedFile(ev.target.files?.[0] ?? null);
              ev.target.value = "";
            }}
          />

          <p className={`text-sm font-medium ${isLight ? "text-slate-900" : "text-white"}`}>{dragActive ? "Drop your file…" : "Drag & drop or browse"}</p>
          <p className={`mt-2 text-xs ${isLight ? "text-slate-500" : "text-[#64748b]"}`}>Single file · PDF, CSV, DOCX · max 10MB</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <label
              htmlFor="user-upload-native-input"
              className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                busy ? "pointer-events-none cursor-not-allowed bg-sky-900/70 opacity-55" : "bg-[#2563eb] hover:bg-[#1d4ed8]"
              }`}
            >
              Select file
            </label>

            <button
              type="button"
              onClick={resetAll}
              disabled={busy}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                busy ? "cursor-not-allowed opacity-50" : isLight ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border border-white/15 bg-[#0F172A] text-[#E5E7EB] hover:bg-white/[0.04]"
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        {(file || uploadStatus !== "idle") && (
          <div className={`mt-6 rounded-xl border p-4 md:p-5 ${isLight ? "border-slate-200 bg-slate-50/70" : "border-white/10 bg-[#0F172A]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-[#f1f5f9]"}`}>
                  {uploadStatus === "uploading"
                    ? "Transferring encrypted payload…"
                    : uploadStatus === "processing"
                      ? "Running security controls…"
                      : uploadStatus === "success"
                        ? "Ingest complete"
                        : uploadStatus === "error"
                          ? "Action required"
                          : file
                            ? "Ready to send"
                            : "Status"}
                </p>
                {file ? (
                  <p className={`mt-1 truncate text-xs tabular-nums ${isLight ? "text-slate-600" : "text-[#94a3b8]"}`} title={file.name}>
                    {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#64748b]"}`}>Network transfer</span>
                <span className={`text-[11px] font-bold tabular-nums ${isLight ? "text-slate-700" : "text-[#cbd5e1]"}`}>{Math.round(transferProgress)}%</span>
              </div>
              <div className={`relative h-2 overflow-hidden rounded-full ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                <motion.div
                  layout
                  className="h-full rounded-full bg-[linear-gradient(90deg,#1d4ed8,#38bdf8)]"
                  initial={false}
                  animate={{ width: `${uploadStatus === "idle" && !busy ? 0 : transferProgress}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 35 }}
                />
              </div>
              {busy && uploadStatus === "processing" ? (
                <p className={`mt-2 text-xs ${isLight ? "text-slate-600" : "text-[#94a3b8]"}`}>Transfer complete · executing vault pipeline</p>
              ) : null}
            </div>

            {uploadStatus === "error" && errorMessage ? (
              <div
                className={`mt-4 flex gap-3 border-l-4 py-3 pl-4 pr-3 text-sm ${isLight ? "border-red-400 bg-red-50/60 text-red-900" : "border-red-500/70 bg-red-500/[0.07] text-red-100"}`}
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            ) : null}

            {showPipeline ? <UploadSecurityPipeline pipelineDone={pipelineDone} phase={pipelinePhase} isLight={isLight} /> : null}

            {uploadStatus === "success" && securityResult ? <SecurityDetailsPanel result={securityResult} isLight={isLight} /> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!file || busy}
                onClick={() => void onUpload()}
                className={`inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                  !file || busy ? "cursor-not-allowed bg-sky-900/55 opacity-60" : "bg-[#3B82F6] hover:bg-[#2563EB]"
                }`}
              >
                {uploadStatus === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : uploadStatus === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Processing…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" aria-hidden />
                    Upload
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={uploadStatus !== "uploading"}
                onClick={onCancelUpload}
                className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  uploadStatus !== "uploading" ? "cursor-not-allowed opacity-45" : isLight ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border border-white/15 bg-[#111827] text-[#f8fafc] hover:bg-white/[0.06]"
                }`}
              >
                Cancel upload
              </button>

              {(uploadStatus === "success" || uploadStatus === "error") && (
                <button type="button" className={`text-sm font-semibold underline underline-offset-2 ${isLight ? "text-sky-700" : "text-[#93c5fd]"}`} onClick={resetAll}>
                  Upload another file
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function axiosErrorMessage(error) {
  const d = error?.response?.data;
  if (d && typeof d === "object" && "error" in d && typeof d.error === "string") return d.error;
  const m = error?.message;
  if (typeof m === "string") return m;
  return "";
}

function axiosIsCancelLike(error) {
  if (!error) return false;
  if (error.code === "ERR_CANCELED" || error.name === "CanceledError" || error.name === "AbortError") return true;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("canceled") || msg.includes("abort");
}

function normalizeClientError(msg, status) {
  const code = typeof status === "number" ? status : 0;

  if (code === 0 || String(msg || "").includes("Network Error"))
    return "Cannot reach upload API. Run npm run dev so the API listens on port 3001.";

  if (code >= 500) return "Upload failed. Server error. Please try again.";

  let m = typeof msg === "string" ? msg : "";
  const lower = m.toLowerCase();

  if (lower.includes("status code 500") || (lower.includes("request failed") && lower.includes("500")))
    return "Upload failed. Server error. Please try again.";

  if (lower.includes("allowed types") || lower.includes("file type") || lower.includes(".pdf") || lower.includes("docx"))
    return m || "Allowed types: PDF, CSV, DOCX (max 10MB).";

  if (lower.includes("file too large") || lower.includes("10mb")) return "Max file size is 10MB.";

  return m || "";
}
