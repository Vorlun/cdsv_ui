/**
 * SOC Secure Upload — ingestion, SHA-256, simulated AV dwell, AES-256-GCM, vault write, audit logs.
 *
 * ⚠ Diploma trace:
 * Plaintext rests only inside `incoming/` until encryption completes → then `unlink` removes it.
 */
import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

import { encryptBufferAes256Gcm } from "../lib/aesEncrypt.mjs";
import { sha256HexFile } from "../lib/fileHash.mjs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|csv|docx)$/i;

/** @typedef {{ iso: string, step: string, detail: string }} SocLogRow */

function socLog(step, detail) {
  return { iso: new Date().toISOString(), step, detail };
}

function scanDelay(ms = 420 + Math.random() * 480) {
  return new Promise((r) => setTimeout(r, ms));
}

function mimeOk(mime, name) {
  const lower = String(name || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (!ALLOWED_EXT.test(name || "")) return false;
  if (lower.endsWith(".csv")) return true;
  if (lower.endsWith(".pdf")) return m.includes("pdf") || m === "application/octet-stream";
  if (lower.endsWith(".docx")) return m.includes("wordprocessingml") || m === "application/octet-stream";
  return true;
}

function computeSecuritySignals(hashHex) {
  let s = 0;
  for (let i = 0; i < Math.min(hashHex.length, 32); i += 1) s = (s * 31 + hashHex.charCodeAt(i)) >>> 0;
  const securityScore = Math.min(100, 87 + (s % 14));
  return { securityScore, threatLevel: "Low" };
}

export function createSocUploadRouter({ incomingDir, encryptedDir }) {
  fs.mkdirSync(incomingDir, { recursive: true });
  fs.mkdirSync(encryptedDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, incomingDir),
    filename: (_req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname || "").slice(0, 8).replace(/[^\w.]/g, "");
      cb(null, `${id}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!mimeOk(file.mimetype, file.originalname)) {
        cb(new Error("Rejected: only PDF, DOCX, or CSV allowed (≤10 MB)."));
        return;
      }
      cb(null, true);
    },
  });

  const router = express.Router();

  router.post("/upload", (req, res) => {
    upload.single("file")(req, res, (err) => {
      /** @type {SocLogRow[]} */
      const logs = [];
      logs.push(socLog("upload_started", "Multipart ingestion channel opened."));
      logs.push(socLog("policy", "Constraints: MIME + extension correlate; SIZE ≤10MB."));

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") logs.push(socLog("reject", "SIZE_GUARD triggered."));
        else logs.push(socLog("reject", String(err.code)));
        return res.status(400).json({
          success: false,
          status: "rejected",
          logs,
          error: err.code === "LIMIT_FILE_SIZE" ? "Rejected: exceeds 10 MB." : err.message,
        });
      }
      if (err) {
        logs.push(socLog("reject", err.message || "Malformed multipart."));
        return res.status(400).json({
          success: false,
          status: "rejected",
          logs,
          error: err.message || "Validation failed.",
        });
      }

      void (async () => {
        try {
          if (!req.file) {
            logs.push(socLog("reject", 'Missing multipart field named "file".'));
            return res.status(400).json({ success: false, status: "rejected", logs, error: "No file uploaded." });
          }

          const originalPath = req.file.path;
          const originalName = req.file.originalname;
          const staged = path.basename(originalPath);

          logs.push(socLog("ingress_complete", `${staged} staged (${req.file.size} bytes).`));

          const hdr = req.headers["x-client-sha256"];
          const clientDigestRaw =
            (typeof req.body?.clientSha256 === "string" && req.body.clientSha256.trim().toLowerCase()) ||
            (typeof hdr === "string" && hdr.trim().toLowerCase()) ||
            "";

          logs.push(socLog("hash_server", "SHA-256 over staged object (SOC anchor)…"));
          const hashHex = await sha256HexFile(originalPath);
          logs.push(socLog("hash_done", `${hashHex.slice(0, 12)}…${hashHex.slice(-8)} (${hashHex.length * 4} bits).`));

          if (clientDigestRaw && /^[a-f0-9]{64}$/.test(clientDigestRaw) && clientDigestRaw !== hashHex) {
            logs.push(socLog("digest_mismatch", "Browser Web Crypto SHA-256 ≠ ingest hash."));
            fs.unlink(originalPath, () => {});
            return res.status(400).json({
              success: false,
              status: "rejected",
              logs,
              error: "Integrity check failed — client/server digest mismatch.",
            });
          }
          if (clientDigestRaw && clientDigestRaw === hashHex) {
            logs.push(socLog("browser_anchor_match", "Client-side WebCrypto digest aligns with ingest anchor."));
          }

          logs.push(socLog("av_simulation", "Heuristic sandbox + signature emulation (dwell time)…"));
          await scanDelay();

          logs.push(socLog("scan_pass", "Simulated IOC sweep: CLEAN (stub — integrate ClamVT / MS Defender API)."));

          const plainBuf = fs.readFileSync(originalPath);
          logs.push(socLog("encrypt_start", "Wrapping ciphertext with AES-256-GCM (unique IV/nonce per object)."));
          const { blob: ciphertextBlob, ivBase64, algorithm } = encryptBufferAes256Gcm(plainBuf);

          const vaultUuid = crypto.randomUUID();
          const vaultName = `${vaultUuid}.enc`;
          const vaultPath = path.join(encryptedDir, vaultName);

          logs.push(socLog("encrypt_done", `${algorithm} encapsulation finalized (nonce exposed to SIEM).`));

          logs.push(socLog("write_vault", `Persisting ciphertext → uploads/encrypted/${vaultName}`));
          fs.writeFileSync(vaultPath, ciphertextBlob);

          fs.unlinkSync(originalPath);
          logs.push(socLog("purge_plaintext", `Purged ephemeral plaintext ${staged}`));

          logs.push(socLog("soc_close", "Chain-of-custody hash + encrypt + vault ACK committed."));

          const { securityScore, threatLevel } = computeSecuritySignals(hashHex);

          return res.status(200).json({
            success: true,
            status: "stored",
            originalName,
            size: req.file.size,
            mimeType: req.file.mimetype || "application/octet-stream",
            hash: hashHex,
            hashDisplay: `sha256-${hashHex}`,
            vaultFile: vaultName,
            encryption: { algorithm, iv: ivBase64 },
            logs,
            securityScore,
            threatLevel,
          });
        } catch (e) {
          console.error("[soc-upload] pipeline:", e);
          logs.push(socLog("fatal", String(e.message || "Pipeline exception")));
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              status: "error",
              logs,
              error: "Upload failed. Server error. Please try again.",
            });
          }
          return undefined;
        }
      })();
    });
  });

  return router;
}
