import { useCallback, useEffect, useState } from "react";
import { env } from "@/config/env";
import { ApiError } from "@/services/api/apiError";
import { getSocFiles } from "@/services/api";
import { buildMockUserDashboard } from "@/services/mockUserDashboard";

/**
 * @typedef {"idle"|"loading"|"success"|"error"} AsyncKind
 */

/**
 * @typedef {{ id?: string, name: string, status: string, uploadedAt: string }} VaultFileRow
 */

function mapMockRecentToVault(recentFiles) {
  const label = { safe: "Safe", pending: "Pending", blocked: "Suspicious" };
  return recentFiles.map((f) => ({
    id: f.id,
    name: f.name,
    status: label[f.status] ?? f.status,
    uploadedAt: f.uploadedAt,
  }));
}

/**
 * Files list for `/user/files` — mock uses deterministic dashboard seed; live uses GET /files.
 * @param {string | undefined} principalSeed
 */
export function useUserVaultFiles(principalSeed) {
  const [phase, setPhase] = useState(/** @type {AsyncKind} */ ("idle"));
  const [files, setFiles] = useState(/** @type {VaultFileRow[]} */ ([]));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      if (env.useMockApi) {
        const dash = buildMockUserDashboard(principalSeed);
        setFiles(mapMockRecentToVault(dash.recentFiles));
        setPhase("success");
        return;
      }
      const rows = await getSocFiles();
      setFiles(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          uploadedAt: r.uploadedAt,
        })),
      );
      setPhase("success");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load vault index.";
      setError(msg);
      setFiles([]);
      setPhase("error");
    }
  }, [principalSeed]);

  useEffect(() => {
    void load();
  }, [load]);

  return { phase, files, error, reload: load };
}
