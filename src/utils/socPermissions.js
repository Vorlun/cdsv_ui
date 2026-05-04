import { SECURITY_GOVERNANCE_DEFAULTS } from "@/services/data/securityGovernanceDefaults";

/**
 * SOC console RBAC aligned with telecom NOC/SOC segregation (demo maps JWT claims → socRole).
 * @typedef {"Admin"|"Analyst"|"Viewer"} SocRole
 */

const CAPABILITIES = Object.freeze({
  Admin: Object.freeze({
    canGovernanceWrite: true,
    canGovernanceExport: true,
    canGovernanceImport: true,
    canMitigateThreat: true,
    canInvestigateThreat: true,
    canDismissThreat: true,
    canAssignIncident: true,
    canSinkholeManual: true,
    canWebhookTest: true,
    /** Upload ingestion destructive / bridge actions */
    canUploadThreatBlock: true,
    canUploadThreatBridge: true,
    canUploadReviewAssign: true,
    canUploadReviewPending: true,
    canUploadReviewResolve: true,
  }),
  Analyst: Object.freeze({
    canGovernanceWrite: false,
    canGovernanceExport: true,
    canGovernanceImport: false,
    canMitigateThreat: false,
    canInvestigateThreat: true,
    canDismissThreat: true,
    canAssignIncident: true,
    canSinkholeManual: false,
    canWebhookTest: true,
    canUploadThreatBlock: false,
    canUploadThreatBridge: true,
    canUploadReviewAssign: true,
    canUploadReviewPending: true,
    canUploadReviewResolve: true,
  }),
  Viewer: Object.freeze({
    canGovernanceWrite: false,
    canGovernanceExport: false,
    canGovernanceImport: false,
    canMitigateThreat: false,
    canInvestigateThreat: false,
    canDismissThreat: false,
    canAssignIncident: false,
    canSinkholeManual: false,
    canWebhookTest: false,
    canUploadThreatBlock: false,
    canUploadThreatBridge: false,
    canUploadReviewAssign: false,
    canUploadReviewPending: false,
    canUploadReviewResolve: false,
  }),
});

/**
 * @param {string | undefined | null} raw
 * @returns {SocRole}
 */
export function normalizeSocRole(raw) {
  const s = String(raw ?? "").trim();
  if (s === "Admin" || s === "Analyst" || s === "Viewer") return s;
  return "Viewer";
}

/**
 * @param {SocRole | string | null | undefined} role
 */
export function getSocCapabilityMatrix(role) {
  const key = normalizeSocRole(role);
  return CAPABILITIES[key];
}

/**
 * @param {SocRole | string | null | undefined} role
 * @param {keyof typeof CAPABILITIES["Admin"]} perm
 */
export function socMay(role, perm) {
  const row = getSocCapabilityMatrix(role);
  return Boolean(row?.[perm]);
}

/**
 * Capability row plus governance-matrix hints for SOC UI disables (defaults when governance snapshot missing).
 * @param {SocRole | string | null | undefined} role
 * @param {Record<string, unknown> | null | undefined} governance
 */
export function buildSocUiGates(role, governance) {
  const r = normalizeSocRole(role);
  const caps = getSocCapabilityMatrix(r);
  const matrix = governance?.rbacMatrix ?? SECURITY_GOVERNANCE_DEFAULTS.rbacMatrix;
  const blockRow = matrix.blockIp ?? {};
  const exportRow = matrix.exportLogs ?? {};
  return {
    canInvestigateThreat: caps.canInvestigateThreat,
    canMitigateThreat: caps.canMitigateThreat,
    canDismissThreat: caps.canDismissThreat,
    canAssignIncident: caps.canAssignIncident,
    canSinkholeManual: caps.canSinkholeManual,
    canGovernanceWrite: caps.canGovernanceWrite,
    canGovernanceImport: caps.canGovernanceImport,
    canGovernanceExport: caps.canGovernanceExport,
    canWebhookTest: caps.canWebhookTest,
    canUploadThreatBlock: caps.canUploadThreatBlock,
    canUploadThreatBridge: caps.canUploadThreatBridge,
    canUploadReviewAssign: caps.canUploadReviewAssign,
    canUploadReviewPending: caps.canUploadReviewPending,
    canUploadReviewResolve: caps.canUploadReviewResolve,
    canUiBlockIp: Boolean(caps.canSinkholeManual && blockRow[r]),
    canUiExportLogs: Boolean(exportRow[r]),
  };
}
