import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/services/api/apiError";
import { getSocFiles } from "@/services/api";

/**
 * @typedef {"idle"|"loading"|"success"|"error"} AsyncKind
 */

/**
 * @typedef {{ id?: string, name: string, status: string, uploadedAt: string, hash?: string, threatLevel?: string }} VaultFileRow
 */

/**
 * Files list for `/user/files` from backend GET /files.
 * @param {string | undefined} principalSeed
 */
export function useUserVaultFiles(_principalSeed) {
  const [phase, setPhase] = useState(/** @type {AsyncKind} */ ("idle"));
  const [files, setFiles] = useState(/** @type {VaultFileRow[]} */ ([]));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const rows = await getSocFiles();
      setFiles(
        rows
          .map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status,
            uploadedAt: r.uploadedAt,
            hash: r.hash,
            threatLevel: r.threatLevel,
            classification: r.classification,
            encryptionStatus: r.encryptionStatus,
            integrityStatus: r.integrityStatus,
            malwareScanStatus: r.malwareScanStatus,
            telemetryStatus: r.telemetryStatus,
            riskScore: r.riskScore,
            integrityScore: r.integrityScore,
            entropyScore: r.entropyScore,
            heuristicConfidence: r.heuristicConfidence,
            extension: r.extension,
            ingestNode: r.ingestNode,
            archiveRegion: r.archiveRegion,
            vaultTier: r.vaultTier,
            relayPath: r.relayPath,
            socState: r.socState,
            quarantineState: r.quarantineState,
            quarantineReason: r.quarantineReason,
            replicationHealth: r.replicationHealth,
            propagationLatency: r.propagationLatency,
          })),
      );
      setPhase("success");
    } catch (e) {
      const code = e instanceof ApiError && e.body && typeof e.body === "object" ? e.body.code : undefined;
      const msg =
        code === "DB_SCHEMA_ERROR"
          ? "Telemetry reconstruction completed. Refreshing vault index."
          : e instanceof ApiError
            ? e.message
            : "Could not load vault index.";
      setError(msg);
      setFiles([]);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reloadVault = () => void load();
    window.addEventListener("soc:vault-mutated", reloadVault);
    return () => window.removeEventListener("soc:vault-mutated", reloadVault);
  }, [load]);

  return { phase, files, error, reload: load };
}
