/**
 * CDSV SOC Demo API — Secure upload gateway (Express 4).
 *
 * Start: npm run dev:server  (usually via npm run dev with Vite)
 */
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSocUploadRouter } from "./routes/socUpload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Keep plaintext uploads only transiently inside «incoming», encrypted blobs in «encrypted». */
const incomingDir = path.join(__dirname, "uploads", "incoming");
const encryptedDir = path.join(__dirname, "uploads", "encrypted");

fs.mkdirSync(incomingDir, { recursive: true });
fs.mkdirSync(encryptedDir, { recursive: true });

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));

/** Lightweight urlencoded for multipart text fields bundled with Multer (`clientSha256`). */
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** Primary SOC ingestion surface (frontend proxies /upload through Vite). */
app.use(createSocUploadRouter({ incomingDir, encryptedDir }));

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found.", root });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, "127.0.0.1", () => {
  console.log(`[SOC-API] http://127.0.0.1:${port}  (incoming → ${incomingDir})`);
});
