import { useCallback, useEffect, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

/**
 * Hydrates ingestion POP lab data and follows {@link subscribeSocStream} payloads for realtime rows.
 */
export function useUploadSecurityLab(options = {}) {
  const actorPrincipal = options.actorPrincipal ?? "";
  const socRole = options.socRole ?? "";
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await socApi.uploadSecurityFeed();
      setFeed(next);
      setError(null);
    } catch (err) {
      setError(normalizeSocError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeSocStream((payload) => {
      if (payload?.uploadSecurity) setFeed(payload.uploadSecurity);
    });
  }, []);

  const applyAction = useCallback(
    async (body) => {
      const result = await socApi.uploadSecurityAction({
        ...body,
        actor: body.actor ?? actorPrincipal,
        socRole: body.socRole ?? socRole,
      });
      if (result.uploadSecurity) setFeed(result.uploadSecurity);
      return result;
    },
    [actorPrincipal, socRole],
  );

  const simulateLabUpload = useCallback(
    async (payload) => {
      const result = await socApi.uploadSecuritySimulate({
        ...payload,
        actor: payload.actor ?? actorPrincipal,
        uploadedByEmail: payload.uploadedByEmail ?? actorPrincipal,
      });
      if (result.uploadSecurity) setFeed(result.uploadSecurity);
      return result;
    },
    [actorPrincipal],
  );

  return { feed, loading, error, refresh, applyAction, simulateLabUpload };
}
