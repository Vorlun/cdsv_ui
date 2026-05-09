function toNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function toTimestampLabel(row, idx) {
  const raw = row?.timestamp ?? row?.time ?? row?.day ?? row?.label;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return `T${String(idx + 1).padStart(2, "0")}`;
}

export function normalizeUploadTelemetryRows(rows, windowSize = 12) {
  const list = Array.isArray(rows) ? rows : [];
  const normalized = list.map((row, idx) => {
    const uploads = toNumber(row?.uploads ?? row?.count ?? row?.total);
    const encrypted = toNumber(row?.encrypted ?? uploads);
    const verified = toNumber(row?.verified ?? Math.min(encrypted, uploads));
    const blocked = toNumber(row?.blocked);
    const scanned = toNumber(row?.scanned ?? uploads);
    const suspicious = toNumber(row?.suspicious ?? blocked);
    return {
      timestamp: toTimestampLabel(row, idx),
      uploads,
      encrypted,
      verified,
      scanned,
      suspicious,
      blocked,
    };
  });

  const sliced = normalized.slice(-windowSize);
  if (!sliced.length) return [];

  if (sliced.length >= windowSize) return sliced;
  const padCount = windowSize - sliced.length;
  const padded = Array.from({ length: padCount }, (_, idx) => ({
    timestamp: `T${String(idx + 1).padStart(2, "0")}`,
    uploads: 0,
    encrypted: 0,
    verified: 0,
    scanned: 0,
    suspicious: 0,
    blocked: 0,
  }));
  return [...padded, ...sliced];
}

export function applyUploadTelemetryEvent(buffer, event, windowSize = 12) {
  const rows = Array.isArray(buffer) ? [...buffer] : [];
  const safeRows = rows.length
    ? rows
    : Array.from({ length: windowSize }, (_, idx) => ({
        timestamp: `T${String(idx + 1).padStart(2, "0")}`,
        uploads: 0,
        encrypted: 0,
        verified: 0,
        scanned: 0,
        suspicious: 0,
        blocked: 0,
      }));

  const now = new Date();
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const last = safeRows[safeRows.length - 1];
  const hasCurrentSlot = last?.timestamp === label;
  if (!hasCurrentSlot) {
    safeRows.push({ timestamp: label, uploads: 0, encrypted: 0, verified: 0, scanned: 0, suspicious: 0, blocked: 0 });
    if (safeRows.length > windowSize) safeRows.shift();
  }

  const target = safeRows[safeRows.length - 1];
  const type = String(event?.type ?? "").toLowerCase();
  const severity = String(event?.severity ?? "").toLowerCase();

  if (type.includes("upload_started") || type.includes("upload_completed") || type.includes("upload")) {
    target.uploads += 1;
  }
  if (type.includes("encryption")) {
    target.encrypted += 1;
  }
  if (type.includes("integrity")) {
    target.verified += 1;
  }
  if (type.includes("malware") || type.includes("scan")) {
    target.scanned += 1;
  }
  if (type.includes("suspicious")) {
    target.suspicious += 1;
  }
  if (type.includes("malware") || severity === "high" || severity === "critical") {
    target.blocked += 1;
  }

  target.encrypted = Math.min(target.encrypted, Math.max(target.uploads, target.encrypted));
  target.verified = Math.min(target.verified, Math.max(target.encrypted, target.verified));

  return safeRows;
}
