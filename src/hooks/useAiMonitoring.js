import { useCallback, useEffect, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

export function useAiMonitoring(options = {}) {
  const pollMs = options.pollMs ?? 7500;

  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [classification, setClassification] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [feed, setFeed] = useState(null);
  const [models, setModels] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus("loading");
      setError(null);
    }
    try {
      const [ov, act, cls, perf, fd, mdl] = await Promise.all([
        socApi.aiOverview(),
        socApi.aiActivity(),
        socApi.aiClassification(),
        socApi.aiPerformance(),
        socApi.aiFeed(48),
        socApi.aiModels(),
      ]);
      setOverview(ov);
      setActivity(act);
      setClassification(cls);
      setPerformance(perf);
      setFeed(fd);
      setModels(mdl);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(normalizeSocError(err).message ?? "AI monitoring unavailable.");
      setStatus("error");
      if (!silent) {
        setOverview(null);
        setActivity(null);
        setClassification(null);
        setPerformance(null);
        setFeed(null);
        setModels(null);
      }
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    let debounceT = null;
    const bump = () => {
      if (debounceT) window.clearTimeout(debounceT);
      debounceT = window.setTimeout(() => void load(true), 450);
    };
    const off = subscribeSocStream(bump);
    const iv = window.setInterval(() => void load(true), pollMs);
    return () => {
      off();
      window.clearInterval(iv);
      if (debounceT) window.clearTimeout(debounceT);
    };
  }, [status, pollMs, load]);

  const fetchModelDetail = useCallback(async (id) => {
    return socApi.aiModelDetail(id);
  }, []);

  return {
    overview,
    activity,
    classification,
    performance,
    feed,
    models,
    status,
    error,
    reload: () => void load(false),
    silentReload: () => void load(true),
    fetchModelDetail,
  };
}
