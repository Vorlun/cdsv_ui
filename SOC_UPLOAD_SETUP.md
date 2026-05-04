# SOC Secure File Upload — Runbook

Professional demo stack: **React (Vite) + Express + Multer + Node `crypto` (SHA-256 + AES-256-GCM)** — no DB; ciphertext stored under `server/uploads/encrypted/`.

## Prerequisites

- Node.js 18+ (needs `crypto`, `ReadableStream`-grade FS APIs).

## Install

```bash
cd /path/to/cdsv/ui
npm install
```

## Start (UI + Gateway)

```bash
npm run dev
```

This runs **two processes**:

| Process | Purpose |
|---------|---------|
| `vite` (5173 typical) | React SPA + **proxy `/upload` → 127.0.0.1:3001** |
| `node server/index.mjs` (3001) | SOC ingestion API |

Open the authenticated **User › Upload** route (e.g. `/user/upload`). The SPA posts to **`/upload`** (same origin proxy).

## SOC operator flow (technical)

1. **Browser**: `crypto.subtle.digest('SHA-256', fileBytes)` annotates custody before egress.
2. **Transport**: multipart `POST /upload` (field `file`, optional duplicate digest via `clientSha256` form field **or** `X-Client-Sha256`).
3. **Server**: Multer stages plaintext under `server/uploads/incoming/<uuid>.<ext>` (UUID rename).
4. **Integrity**: Streams SHA-256 over disk staging path; compares digest if browser supplied anchor.
5. **Sim AV**: Controlled `setTimeout` emulates heuristic engine dwell (swap for ClamAV / vendor API).
6. **Encrypt**: Loads staging buffer → **AES-256-GCM** with random **12-byte IV** (`encryptBufferAes256Gcm`).
7. **Vault**: Writes `nonce || ciphertext || tag` blob to `server/uploads/encrypted/<uuid>.enc` then **unlink** plaintext staging (secure delete analogue).
8. **SIEM-ish**: Structured `logs[]` echoed to UI ticker.

## Encryption key (⚠ LAB)

Provide a long passphrase:

```bash
export SCUP_AES_MASTER="soc-long-random-enterprise-secret-here"
npm run dev:server
```

If unset, server derives deterministic demo bytes (fine for coursework **not** for production custody).

## API contract (happy path HTTP 200)

```json
{
  "success": true,
  "status": "stored",
  "originalName": "...",
  "size": 12345,
  "mimeType": "application/pdf",
  "hash": "<64 hex lowercase>",
  "hashDisplay": "sha256-<64 hex lowercase>",
  "vaultFile": "<uuid>.enc",
  "encryption": { "algorithm": "AES-256-GCM", "iv": "<base64 IV>" },
  "logs": [ { "iso": "...", "step": "", "detail": "" } ],
  "securityScore": 94,
  "threatLevel": "Low"
}
```

### Health ping

```bash
curl -s http://127.0.0.1:3001/api/health
```

## Lint / Production bundle

```bash
npm run lint
npm run build
```

Static `npm run build` output does **not** embed the gateway — uploads require the Express tier running (or retrofit to prod API URL).
