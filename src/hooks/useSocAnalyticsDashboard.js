import { useCallback, useEffect, useState } from "react";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

export function useSocAnalyticsDashboard(options = {}) {
  const pollMs = options.pollMs ?? 65000;

  const [overview, setOverview] = useState(null);
  const [usersBoard, setUsersBoard] = useState(null);
  const [threats, setThreats] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [system, setSystem] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [ai, setAi] = useState(null);
  const [feed, setFeed] = useState(null);
  const [trends, setTrends] = useState(null);
  const [regAuth, setRegAuth] = useState(null);
  const [securitySeries, setSecuritySeries] = useState(null);
  const [fileTypes, setFileTypes] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus("loading");
      setError(null);
    }
    try {
      const [
        ov,
        usr,
        thr,
        upl,
        sys,
        tel,
        aiSlice,
        fd,
        tr,
        ra,
        sec,
        ft,
      ] = await Promise.all([
        socApi.analyticsOverview(),
        socApi.analyticsUsers(40),
        socApi.analyticsThreats(),
        socApi.analyticsUploads(),
        socApi.analyticsSystem(),
        socApi.analyticsTelemetry(),
        socApi.analyticsAi(),
        socApi.analyticsFeed(42),
        socApi.analyticsTrends(),
        socApi.analyticsRegistrationAuth(),
        socApi.analyticsSecuritySeries(),
        socApi.analyticsFileTypes(),
      ]);
      setOverview(ov);
      setUsersBoard(usr);
      setThreats(thr);
      setUploads(upl);
      setSystem(sys);
      setTelemetry(tel);
      setAi(aiSlice);
      setFeed(fd);
      setTrends(tr);
      setRegAuth(ra);
      setSecuritySeries(sec);
      setFileTypes(ft);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(normalizeSocError(err).message ?? "Analytics unavailable.");
      setStatus("error");
      if (!silent) {
        setOverview(null);
        setUsersBoard(null);
      }
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (status !== "ready") return undefined;
    let t = null;
    const bump = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => void load(true), 500);
    };
    const off = subscribeSocStream(bump);
    const iv = window.setInterval(() => void load(true), pollMs);
    return () => {
      off();
      window.clearInterval(iv);
      if (t) window.clearTimeout(t);
    };
  }, [status, pollMs, load]);

  return {
    overview,
    usersBoard,
    threats,
    uploads,
    system,
    telemetry,
    ai,
    feed,
    trends,
    regAuth,
    securitySeries,
    fileTypes,
    status,
    error,
    reload: () => void load(false),
  };
}
