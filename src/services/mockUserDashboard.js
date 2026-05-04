/**
 * Deterministic mock workspace snapshot for the user console (local demo).
 * @param {string | undefined} principal
 */
export function buildMockUserDashboard(principal) {
  const seed = hashSeed(principal || "demo-user");
  const uploadsTotal = 38 + (seed % 24);
  const recentFiles = buildRecentFiles(seed);
  const activity = buildActivity(seed, recentFiles);
  const uploadsTimeline = buildTimeline(seed);
  const fileStatus = buildFileStatusCounts(seed);
  const { score: securityScore, breakdown: securityBreakdown } = buildSecurityModel(seed, fileStatus, recentFiles);

  return {
    uploadsTotal,
    lastLoginAt: new Date(Date.now() - (25 + (seed % 120)) * 60_000).toISOString(),
    securityScore,
    securityBreakdown,
    activity,
    uploadsTimeline,
    fileStatus,
    recentFiles,
  };
}

/** Score 0–100 with line items for dashboard tooltip (deterministic). */
function buildSecurityModel(seed, fileStatus, recentFiles) {
  const safe = fileStatus.safe;
  const blocked = fileStatus.blocked;
  const pending = fileStatus.pending;
  const encryptedCount = recentFiles.filter((f) => f.status === "safe").length + (6 + (seed % 5));

  const safePts = Math.min(32, Math.round(safe * 0.9));
  const encPts = Math.min(22, 10 + (encryptedCount % 13));
  const pendingPen = -Math.min(20, pending * 7 + (seed % 4));
  const blockedPen = -Math.min(40, blocked * 14 + (blocked > 0 ? 4 + (seed % 5) : 0));

  const raw = 48 + safePts + encPts + pendingPen + blockedPen;
  const score = Math.max(0, Math.min(100, raw));

  const breakdown = {
    positives: [
      { label: "Safe uploads", points: safePts, detail: `${safe} cleared objects` },
      { label: "Encrypted files", points: encPts, detail: `${encryptedCount} at-rest` },
    ],
    negatives: [
      { label: "Pending reviews", points: pendingPen, detail: `${pending} in queue` },
      { label: "Blocked files", points: blockedPen, detail: `${blocked} policy hits` },
    ],
  };

  return { score, breakdown };
}

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildRecentFiles(seed) {
  const names = [
    "carrier_cdr_export_may.csv",
    "site_survey_photos.zip",
    "vlan_matrix_v3.xlsx",
    "incident_evidence.pcap",
    "policy_delta.json",
    "subscriber_sample_redacted.csv",
  ];
  const statuses = ["safe", "safe", "pending", "blocked", "safe", "pending"];
  return names.map((name, i) => {
    const st = statuses[(seed + i) % statuses.length];
    return {
      id: `uf-${seed}-${i}`,
      name,
      status: st,
      uploadedAt: new Date(Date.now() - (i + 1) * 3_600_000 - (seed % 7) * 60_000).toISOString(),
      sizeLabel: ["1.2 MB", "48 MB", "320 KB", "8.1 MB", "24 KB", "560 KB"][i],
    };
  })
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 5);
}

function buildActivity(seed, files) {
  const base = [
    {
      id: `act-${seed}-0`,
      type: "upload",
      file: files[0]?.name ?? "routing_matrix.csv",
      at: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
    {
      id: `act-${seed}-1`,
      type: "scan",
      file: files[1]?.name ?? "site_survey_photos.zip",
      at: new Date(Date.now() - 45 * 60_000).toISOString(),
    },
    {
      id: `act-${seed}-2`,
      type: "download",
      file: "acknowledgement_pack.pdf",
      at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    },
    {
      id: `act-${seed}-3`,
      type: "review",
      file: files[2]?.name ?? "policy_delta.json",
      at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    },
    {
      id: `act-${seed}-4`,
      type: "login",
      file: "—",
      at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    },
    {
      id: `act-${seed}-5`,
      type: "upload",
      file: "handover_notes.docx",
      at: new Date(Date.now() - 30 * 3_600_000).toISOString(),
    },
  ];
  return base.slice(0, 5);
}

/**
 * 7-day upload counts — always non-negative. Uses unsigned shifts so large
 * email-hash seeds never produce negative `>>` / `%` artifacts in JS.
 */
function buildTimeline(seed) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const template = [3, 5, 7, 4, 6, 8, 7];
  return labels.map((label, i) => {
    const jitter = (seed >>> (i % 6)) % 3;
    const uploads = template[i] + jitter;
    return { label, uploads: Math.max(1, uploads) };
  });
}

/** Workspace totals (not limited to the recent-files table). */
function buildFileStatusCounts(seed) {
  return {
    safe: 14 + (seed % 19),
    blocked: seed % 6 === 0 ? 0 : 1 + (seed % 3),
    pending: seed % 5,
  };
}
