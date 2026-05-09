import { useMemo } from "react";

function sum(rows, key) {
  return rows.reduce((acc, row) => acc + Number(row?.[key] || 0), 0);
}

export function useUploadMetrics(rows, lastSyncAt) {
  return useMemo(() => {
    const uploads = sum(rows, "uploads");
    const encrypted = sum(rows, "encrypted");
    const verified = sum(rows, "verified");
    const scanned = sum(rows, "scanned");
    const suspicious = sum(rows, "suspicious");
    const blocked = sum(rows, "blocked");

    const last = rows[rows.length - 1] || {};
    const prev = rows[rows.length - 2] || {};
    const delta = Number(last.uploads || 0) - Number(prev.uploads || 0);
    const uploadsPerMinute = Number(last.uploads || 0);
    const secureRate = uploads > 0 ? Math.round((verified / Math.max(1, uploads)) * 100) : 0;
    const encryptedRatio = uploads > 0 ? Math.round((encrypted / Math.max(1, uploads)) * 100) : 0;
    const scanLatencyMs = Math.max(18, Math.round(24 + suspicious * 3 + Math.max(0, uploadsPerMinute - 3) * 1.5));
    const queueDepth = Math.max(0, uploads - verified - blocked);
    const relaySyncConfidence = Math.max(82, Math.min(99, 98 - suspicious * 2 - queueDepth));
    const pipelineState = suspicious > 0 || blocked > 0 ? "inspection watch" : connectedLabel(delta);

    return {
      uploads,
      encrypted,
      verified,
      scanned,
      suspicious,
      blocked,
      delta,
      uploadsPerMinute,
      secureRate,
      encryptedRatio,
      scanLatencyMs,
      queueDepth,
      relaySyncConfidence,
      quarantineCount: blocked + suspicious,
      pipelineState,
      ingestionNode: uploadsPerMinute > 3 ? "INGEST-NODE-2" : "INGEST-NODE-1",
      channelState: encryptedRatio >= 95 ? "TLS-VERIFIED" : "EDGE-UPLINK",
      freshnessLabel: lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString("en-GB", { hour12: false }) : "--:--:--",
    };
  }, [rows, lastSyncAt]);
}

function connectedLabel(delta) {
  if (delta > 1) return "upload burst";
  if (delta < 0) return "queue recovery";
  return "relay synced";
}
