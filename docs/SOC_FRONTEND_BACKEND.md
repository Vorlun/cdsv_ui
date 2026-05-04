# SOC console — frontend ↔ backend integration

This document matches the SPA implementation under `src/services/api.js`, `SocSecureUpload`, and user-area pages.

## Configuration

| Variable | Meaning |
|---------|---------|
| `VITE_USE_MOCK_API` | `"false"` → HTTP helpers call the real gateway; omitted/`"true"` → UI uses in-process mocks (dashboard seed, simulated security drift). |
| `VITE_API_BASE_URL` | Base segment for REST calls (no trailing slash), e.g. `https://api.example.com/api/v1`. Final URL is `{base}/upload`, etc. |

## Endpoints (relative to `VITE_API_BASE_URL`)

| Method | Path | Caller |
|--------|------|--------|
| `POST` | `/upload` | `postSocUpload` — multipart `FormData` with field `file` and optional `clientSha256`. |
| `GET` | `/files` | `UserFilesPage` via `useUserVaultFiles`. |
| `GET` | `/security-status` | `UserSecurityPage` (polling + sync button). |
| `GET` | `/sessions` | `getSocSessions` (ready for profile wiring). |
| `POST` | `/settings` | `UserSettingsPage` save action. |

## Response contracts

### `POST /upload` (200 OK)

Parsed by `parseSocUploadResponse`; numbers are clamp-checked.

```json
{
  "status": "stored",
  "fileId": "vault-object-id",
  "hash": "hex-sha256-from-server",
  "encryption": "AES-256-GCM",
  "threatLevel": "LOW",
  "securityScore": 94
}
```

### `GET /security-status`

```json
{
  "device": 96,
  "frontend": 91,
  "backend": 94,
  "encryption": 99,
  "cloud": 92
}
```

Each dimension must be a number in `0..100`; the client rounds and clamps input.

### `GET /sessions`

```json
[
  {
    "device": "macOS · Chrome · Analyst",
    "ip": "198.51.100.42",
    "location": "Tashkent, UZ",
    "lastActive": "2026-05-04T09:41:02.000Z",
    "status": "active"
  }
]
```

### `GET /files`

Either a bare array or `{ "files": [ ... ] }`, where each row may include:

- `id` | `fileId`
- `name`
- `status` — free text badge (normalized for tone in UI)
- `uploadedAt` | `createdAt`
- optional `hash`, `threatLevel`

### `POST /settings`

The UI posts:

```json
{
  "mfaEnabled": true,
  "securityMode": "strict",
  "storageMode": "vault_hardened",
  "notifications": {
    "email": true,
    "suspiciousActivity": true,
    "uploadAnomalies": true
  },
  "clientMeta": { "sdk": "vite-react" }
}
```

Backend may acknowledge with `{ "ok": true }` or any JSON; parsing is permissive unless you extend typed handling.

---

## Frontend behaviour overview

### Upload flow (`SocSecureUpload`)

1. **Pick file** → client-side MIME extension + **10 MB cap** enforced.
2. **SHA-256** via WebCrypto (`digestSha256HexFromBlob`).
3. **Simulated SOC pipeline stages** — operator UX dwell + progress.
4. If `VITE_USE_MOCK_API=false`, **multipart `POST /upload`** runs after staging; acknowledgement fields replace local IDs where present. Failures remain visible (“simulation OK, gateway declined …” banner).

### Security pipeline

- Dashboard uses `buildMockUserDashboard` posture model when mocking.
- `UserSecurityPage` uses random drift locally or live polling from `/security-status` every ~28s.

### Errors

- Policies (type/size/reject empty) emit **alert** panels.
- Networking errors show **retry** affordances (`UserFilesPage`, `UserSecurityPage`) or inline save errors (`UserSettingsPage`).

---

## Textual data-flow (live API)

```
UserBrowser
  │
  │ WebCrypto SHA-256 (blob)
  ├────────────────────────────► User preview + pipeline UI
  │
  │ multipart POST /upload (+ bearer from apiRequest)
  ├────────────────────────────► Ingest tier → `{ fileId, hash, encryption, … }`
  │
  │ GET /files / GET /security-status / POST /settings
  └────────────────────────────► Posture telemetry + prefs

Auth: `Authorization: Bearer <token>` injected by `apiRequest` unless overridden.
```

## Backend checklist

- Honour **multipart** ingestion and optional `clientSha256` for correlation with SOC logs.
- Return **canonical JSON** aligned with parsers above (`422`-safe messages help operators).
- Enforce parity between **stored hash** vs client-declared SHA for tamper lineage.
- **Rate-limit + audit** uploads; echo `threatLevel` + numeric `securityScore` from antivirus / DLP / policy tiers.
- For `/settings`, map into your identity provider or preference store idempotently.
