import { memo, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, RefreshCw, Shield, X } from "lucide-react";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";

const STATE_STYLES = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  failed: "border-rose-500/35 bg-rose-500/12 text-rose-200",
  syncing: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  warning: "border-amber-500/35 bg-amber-500/12 text-amber-100",
};

function humanizeLabel(raw) {
  const map = {
    Excellent: "Healthy",
    Stable: "Stable",
    Warning: "Warning",
    Critical: "Critical",
    Offline: "Offline",
  };
  return map[raw] ?? raw;
}

export default memo(function SecurityControlDrawer({ controlId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!controlId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await socApi.securityControlDetail(controlId);
      setData(res);
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setLoading(false);
    }
  }, [controlId]);

  useEffect(() => {
    if (open && controlId) void load();
  }, [open, controlId, load]);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const ctrl = data?.control;
  const state = ctrl?.state ?? "active";

  const handleRefresh = async () => {
    if (!controlId) return;
    setBusy(true);
    try {
      await socApi.securityControlRefresh(controlId);
      await load();
    } catch (e) {
      setError(normalizeSocError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close control inspector"
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-[480px] flex-col border-l border-white/10 bg-gradient-to-b from-[#080d14] to-[#050810] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/70">Control inspection</p>
                <h2 className="truncate text-base font-semibold text-white">{ctrl?.title ?? "Governance control"}</h2>
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATE_STYLES[state] ?? STATE_STYLES.active}`}
                >
                  <Shield className="h-3 w-3" />
                  {state}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRefresh}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                  title="Refresh validation"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {error ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}

              {loading && !data ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400/80" />
                  <span className="text-xs">Loading governance bundle…</span>
                </div>
              ) : null}

              {data ? (
                <div className="space-y-4 text-sm">
                  <section>
                    <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live summary</h3>
                    <p className="text-sm leading-relaxed text-slate-200">{ctrl?.detail}</p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Diagnostics</h3>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
                        <dt className="text-slate-500">Last validation</dt>
                        <dd className="mt-1 font-mono text-slate-200">{data.diagnostics?.lastValidation ?? "—"}</dd>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
                        <dt className="text-slate-500">Config plane</dt>
                        <dd className="mt-1 font-mono text-slate-200">{data.diagnostics?.configVersion ?? "—"}</dd>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
                        <dt className="text-slate-500">Failure signals (24h)</dt>
                        <dd className="mt-1 font-mono text-slate-200">{data.diagnostics?.failureCount24h ?? 0}</dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Platform posture</h3>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Overall</span>
                        <span className="font-semibold text-cyan-200">
                          {humanizeLabel(data.context?.overview?.platformHealth ?? "—")}
                        </span>
                      </div>
                      {data.context?.overview?.scores ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px]">
                          {Object.entries(data.context.overview.scores).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-slate-500">
                              <span>{k}</span>
                              <span className="text-slate-200">{v}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent alerts</h3>
                    <ul className="space-y-2">
                      {(data.recentAlerts ?? []).slice(0, 8).map((a) => (
                        <li key={a.id} className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-2 text-[11px]">
                          <div className="flex justify-between gap-2 text-slate-500">
                            <span className="font-semibold text-slate-300">{a.type}</span>
                            <span className="shrink-0 uppercase text-[10px] text-amber-300/90">{a.severity}</span>
                          </div>
                          <p className="mt-1 text-slate-400">{a.message}</p>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recommendations</h3>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300">
                      {(data.recommendations ?? []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
});
