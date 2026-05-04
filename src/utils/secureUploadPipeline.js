import { sanitizePlainText } from "@/utils/sanitize";

/** Canonical northbound ingestion stages for telecom BSS/OSS file gateways (tooltips aid analyst explainability). */
export const INGEST_PIPELINE_STEPS = Object.freeze([
  {
    key: "uploaded",
    label: "Intake · file received",
    order: 0,
    tooltip:
      "Edge POP accepts the blob, normalizes filenames, rejects path traversal / control characters, stamps tenant + principal for billing assurance.",
  },
  {
    key: "encryption",
    label: "Posture · encryption check",
    order: 1,
    tooltip:
      "Simulation of CM KMS attestation vs plaintext drops. Encrypted artefacts inherit relaxed transport rules while plaintext high-yield payloads raise correlation priority.",
  },
  {
    key: "malware",
    label: "Defense · malware scan",
    order: 2,
    tooltip:
      "Layered heuristic + reputation fusion (sandbox queue optional). Telemetry score drives automatic promotion into SOC/SIEM when thresholds trip.",
  },
  {
    key: "policy",
    label: "Policy · type / size gates",
    order: 3,
    tooltip:
      "OSS / BSS file-type cardinality, ingestion POP quotas, forbidden executable surfaces combined with OSS DLP overlays for roaming and CDR exports.",
  },
  {
    key: "risk",
    label: "Analytics · risk classification",
    order: 4,
    tooltip:
      "Composite carrier risk merges extension tiers, cryptography posture, and scanner outcomes before governance routing (allow lane vs SOC queue).",
  },
  {
    key: "decision",
    label: "Governance · final disposition",
    order: 5,
    tooltip:
      "Final routing: ALLOW (object store), REVIEW (analyst backlog), BLOCK (hard stop). Reasons and triggered rules replay here for regulatory traceability.",
  },
]);

/** @param {string} raw */
export function sanitizeUploadFileName(raw) {
  const base = sanitizePlainText(String(raw ?? "").replace(/^.*[/\\]/, "").trim(), 220);
  if (!base || base === "." || base === "..") return "unnamed.bin";
  return base.replace(/[<>:"|?*\x00-\x1f]/g, "_").slice(0, 200);
}

/** @param {string} fileName */
export function fileExtension(fileName) {
  const safe = sanitizeUploadFileName(fileName);
  const dot = safe.lastIndexOf(".");
  if (dot <= 0 || dot === safe.length - 1) return "";
  return safe.slice(dot + 1).toLowerCase();
}

/**
 * Extension-derived carrier risk envelope (combined with telemetry in ingest).
 */
export function extensionCarrierRisk(ext) {
  const e = String(ext ?? "").toLowerCase().replace(/^\./, "");
  if (["exe", "bat", "cmd", "ps1", "msi", "scr", "dll", "vbs", "js", "lnk"].includes(e)) return "high";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(e)) return "medium";
  if (["csv", "pdf", "txt", "json", "xml", "png", "jpg", "jpeg"].includes(e)) return "low";
  return "medium";
}

const MAX_INGEST_MB = 120;

/**
 * OSS policy gate — illustrative DLP-style limits for cloud telecom OSS.
 */
export function validateCarrierPolicy({ sizeMb, ext, encryptionState }) {
  const e = String(ext ?? "").toLowerCase();
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    return { ok: false, code: "size_invalid", message: "Object size telemetry missing or zero." };
  }
  if (sizeMb > MAX_INGEST_MB) {
    return { ok: false, code: "size_cap", message: `Exceeds ${MAX_INGEST_MB} MB ingestion POP cap.` };
  }
  /** Block bare executables regardless of posture (carrier hardening simulation). */
  if (["exe", "msi", "scr"].includes(e) && encryptionState === "Unencrypted") {
    return { ok: false, code: "exec_surface", message: "Unencrypted executable blocked by POP ingress policy." };
  }
  return { ok: true };
}

/**
 * Simulate CM / TLS-at-rest signal (lab — not cryptographic proof).
 */
export function simulateEncryptionAttestation(seed) {
  /** Deterministic rolling mix (~58 % ciphertext-wrapped lab traffic, remainder plaintext legacy feeders). */
  let h = 5381;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h * 33 + s.charCodeAt(i)) | 0;
  const roll = Math.abs(h >>> 0) % 100;
  const encrypted = roll < 58;
  const state = encrypted ? "Encrypted" : "Unencrypted";
  const detail = encrypted
    ? "Object marked as client-side KMS-wrapped · attestation ACCEPT"
    : "Plaintext ingest — egress warning enabled";
  return { state, detail: sanitizePlainText(detail, 320) };
}

/**
 * Simulate AV/heuristic telemetry fusion.
 * @typedef {{ verdict: 'clean'|'suspicious'|'malicious', signals: string, score: number }} MalwareVerdict
 */
export function simulateMalwareFusionCarriers(ext, encryptionState, carrierExtRisk, seedStr) {
  const e = String(ext ?? "").toLowerCase();
  let h = 0;
  for (let i = 0; i < seedStr.length; i += 1) h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  let score = 12 + Math.abs(h % 61);
  if (carrierExtRisk === "high") score += 38;
  if (carrierExtRisk === "medium") score += 18;
  if (encryptionState === "Unencrypted" && carrierExtRisk === "high") score += 24;
  if (["exe", "bat", "dll"].includes(e)) score += 14;

  let verdict = "clean";
  if (score >= 88) verdict = "malicious";
  else if (score >= 55) verdict = "suspicious";

  const signals = sanitizePlainText(
    verdict === "malicious"
      ? `High static entropy · reputation ${score} · heuristic ${e || "opaque"} classifier`
      : verdict === "suspicious"
        ? `Elevated composite score ${score} · deferred sandbox queue`
        : `Signature negative · fused score ${score}`,
    340,
  );
  return /** @type {const} */ ({
    verdict,
    signals,
    score: Math.min(100, score),
  });
}

/**
 * Fuse extension carrier risk + malware + policy outcome.
 */
export function computeCompositeRiskLabel({ carrierExtRisk, malwareVerdict }) {
  if (malwareVerdict === "malicious") return "High";
  if (malwareVerdict === "suspicious") return "High";
  if (carrierExtRisk === "high") return "High";
  if (carrierExtRisk === "medium") return "Medium";
  if (carrierExtRisk === "low" && malwareVerdict === "clean") return "Low";
  return "Medium";
}

/**
 * Final egress decision for object store routing.
 */
export function computeFinalDisposition({ policyOk, malwareVerdict, compositeRisk }) {
  if (!policyOk) return "block";
  if (malwareVerdict === "malicious") return "block";
  if (malwareVerdict === "suspicious" || compositeRisk === "High") return "review";
  return "allow";
}

/**
 * Shifts ingestion malware scoring using Security Control Center threat sensitivity — models central policy propagation.
 */
export function applyGovernanceSensitivityToMalware(baseMal, sensitivityRaw, extHint) {
  const sensitivity = Math.min(100, Math.max(0, Number(sensitivityRaw) || 0));
  const bump = Math.round((sensitivity / 100) * 30);
  const score = Math.min(100, baseMal.score + bump);
  let verdict = "clean";
  if (score >= 88) verdict = "malicious";
  else if (score >= 55) verdict = "suspicious";
  const e = String(extHint ?? "").toLowerCase();
  const signals = sanitizePlainText(
    verdict === "malicious"
      ? `High static entropy · governance-shifted reputation ${score} · heuristic ${e || "opaque"} classifier`
      : verdict === "suspicious"
        ? `Elevated fused score ${score} · SOC sensitivity augmentation`
        : `Signature negative · fused score ${score} (policy-augmented)`,
    360,
  );
  return /** @type {typeof baseMal & { verdict: string, signals: string, score: number }} */ ({
    ...baseMal,
    verdict,
    score,
    signals,
  });
}

/**
 * @param {{
 *   id: string,
 *   fileName: string,
 *   uploadedByEmail: string,
 *   sizeMb: number,
 * }} inp
 * @param {{ threatSensitivity?: number }} [governance]
 */
export function buildProcessedIngestionJob(inp, governance = {}) {
  const safeName = sanitizeUploadFileName(inp.fileName);
  const ext = fileExtension(safeName);
  const carrierExtRisk = extensionCarrierRisk(ext);
  const enc = simulateEncryptionAttestation(`${inp.id}|${safeName}`);
  const pol = validateCarrierPolicy({
    sizeMb: inp.sizeMb,
    ext,
    encryptionState: enc.state,
  });

  const malBase = simulateMalwareFusionCarriers(ext, enc.state, carrierExtRisk, `${inp.id}|${carrierExtRisk}`);
  const mal = applyGovernanceSensitivityToMalware(
    malBase,
    governance.threatSensitivity ?? 76,
    ext,
  );

  const compositeRisk = computeCompositeRiskLabel({
    carrierExtRisk,
    malwareVerdict: mal.verdict,
  });

  const finalDecision = computeFinalDisposition({
    policyOk: pol.ok,
    malwareVerdict: mal.verdict,
    compositeRisk,
  });

  const scanLabel =
    mal.verdict === "malicious" ? "Threat" : mal.verdict === "suspicious" ? "Review" : "Safe";

  /** @type {{ key: string, status: string, headline: string, detail: string }[]} */
  const stages = [];

  stages.push({
    key: "uploaded",
    status: "pass",
    headline: "Object admitted to ingestion POP",
    detail: sanitizePlainText(`Uploader ${inp.uploadedByEmail} · ${safeName}`, 420),
  });

  stages.push({
    key: "encryption",
    status: enc.state === "Encrypted" ? "pass" : "warn",
    headline: `Encryption: ${enc.state}`,
    detail: enc.detail,
  });

  stages.push({
    key: "malware",
    status:
      mal.verdict === "malicious" ? "fail" : mal.verdict === "suspicious" ? "warn" : "pass",
    headline: `Malware telemetry · ${sanitizePlainText(mal.verdict, 32)} (score ${mal.score})`,
    detail: mal.signals,
  });

  stages.push({
    key: "policy",
    status: pol.ok ? "pass" : "fail",
    headline: pol.ok ? "Policy gate ACCEPT" : "Policy gate DENY",
    detail: sanitizePlainText(pol.ok ? "MIME / cardinality within carrier SO profile" : pol.message ?? "", 320),
  });

  stages.push({
    key: "risk",
    status: compositeRisk === "Low" ? "pass" : compositeRisk === "Medium" ? "warn" : "fail",
    headline: `Composite risk · ${compositeRisk}`,
    detail: sanitizePlainText(`Extension tier ${carrierExtRisk} fused with telemetry`, 420),
  });

  stages.push({
    key: "decision",
    status: finalDecision === "allow" ? "pass" : finalDecision === "review" ? "warn" : "fail",
    headline:
      finalDecision === "allow"
        ? "Routed · allow to object partition"
        : finalDecision === "review"
          ? "Holding · SOC review lane"
          : "Blocked · egress denied",
    detail: sanitizePlainText(`${finalDecision.toUpperCase()} · scan=${scanLabel}`, 240),
  });

  const triggeredRules = [];
  if (!pol.ok && pol.code) triggeredRules.push(`POP-OSS-${String(pol.code).toUpperCase()}`);
  if (mal.verdict === "malicious") {
    triggeredRules.push(`ING-GW-MWF-SCORE-${Math.min(100, Math.round(mal.score))}`);
    triggeredRules.push("ING-GW-MWF-AUTO-BLOCK");
  }
  if (!pol.ok && ["exe", "msi", "scr"].includes(String(ext).toLowerCase()) && enc.state === "Unencrypted") {
    triggeredRules.push("POP-OSS-EXEC-PLAIN");
  }

  let blockReason = null;
  if (finalDecision === "block") {
    const clauses = [];
    if (!pol.ok) clauses.push(`Policy gate: ${pol.message ?? pol.code ?? "denied"}`);
    if (mal.verdict === "malicious")
      clauses.push(
        `Malware telemetry marked ${ext ? String(ext).toUpperCase() : "object"} as malicious (score ${Math.round(mal.score)})`,
      );
    if (carrierExtRisk === "high" && enc.state === "Unencrypted")
      clauses.push("High-yield carrier extension while plaintext — automatic egress deny");
    blockReason = sanitizePlainText(clauses.filter(Boolean).join(" · "), 420);
  }

  const summaryNarrative =
    finalDecision === "allow"
      ? sanitizePlainText(
          `${safeName}: low-friction allow — ${carrierExtRisk}-tier extension, ${enc.state}, AV ${mal.verdict}.`,
          360,
        )
      : finalDecision === "review"
        ? sanitizePlainText(
            `${safeName}: analyst review — ${scanLabel} verdict, composite ${compositeRisk}, ${enc.state}.`,
            360,
          )
        : sanitizePlainText(
            `${safeName}: blocked — carrier rules + fused telemetry produced hard stop (${triggeredRules.slice(0, 2).join(", ") || "policy"})`,
            420,
          );

  const iso = new Date().toISOString();

  /** @type {{ phase: string, label: string, detail: string, at: string }[]} */
  const lifecycle = [
    {
      phase: "uploaded",
      label: "Northbound ingest POP",
      detail: sanitizePlainText(`Principal ${inp.uploadedByEmail} · admitted object ${safeName}`, 360),
      at: iso,
    },
    {
      phase: "scanned",
      label: "Fusion engine complete",
      detail: sanitizePlainText(
        `AV ${mal.verdict} (score ${Math.round(mal.score)}) · policy ${pol.ok ? "ACCEPT" : "DENY"} · composite ${compositeRisk}`,
        420,
      ),
      at: iso,
    },
  ];
  if (finalDecision === "block") {
    lifecycle.push({
      phase: "blocked",
      label: "Egress withheld",
      detail: blockReason ?? sanitizePlainText("Carrier governance denied release.", 360),
      at: iso,
    });
  }
  if (finalDecision === "review") {
    lifecycle.push({
      phase: "investigation_queued",
      label: "SOC review lane",
      detail: sanitizePlainText("Pending analyst verdict before object store promotion.", 360),
      at: iso,
    });
  }

  return {
    id: sanitizePlainText(String(inp.id), 96),
    fileName: safeName,
    uploadedByEmail: sanitizePlainText(String(inp.uploadedByEmail ?? ""), 254).toLowerCase(),
    sizeMb: Math.min(MAX_INGEST_MB + 80, Math.max(0.01, Number(inp.sizeMb) || 0)),
    ext: sanitizePlainText(ext, 32),
    carrierExtRisk,
    encryption: enc.state,
    encryptionDetail: enc.detail,
    malware: mal,
    policy: pol,
    compositeRisk,
    scanResult: scanLabel,
    finalDecision,
    blocked: finalDecision === "block",
    assignedToEmail: "",
    investigationStatus: finalDecision === "review" ? "pending" : "none",
    threatEscalated: false,
    pipelineComplete: true,
    stages,
    lifecycle,
    linkedThreatAlertId: "",
    explainability: {
      summary: summaryNarrative,
      blockReason,
      triggeredRules,
    },
    updatedAt: iso,
  };
}
