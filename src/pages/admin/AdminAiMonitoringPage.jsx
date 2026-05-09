import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Cpu,
  Layers,
  Loader2,
  MemoryStick,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useAiMonitoring } from "@/hooks/useAiMonitoring";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { sanitizePlainText } from "@/utils/sanitize";

function healthBadgeClass(state) {
  const s = String(state ?? "").toLowerCase();
  if (s === "optimal") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  if (s === "stable") return "border-cyan-500/35 bg-cyan-500/10 text-cyan-200";
  if (s === "drift warning") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  if (s === "retraining") return "border-violet-500/35 bg-violet-500/10 text-violet-200";
  return "border-rose-500/35 bg-rose-500/10 text-rose-200";
}

function TrendDelta({ value, invert }) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return <span className="text-[10px] text-[#64748B]">steady</span>;
  const up = n > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${good ? "text-emerald-400" : "text-rose-400"}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(Math.round(n))}%
    </span>
  );
}

const AiActivityPanel = memo(function AiActivityPanel({ series }) {
  const data = Array.isArray(series) ? series : [];
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="aiDetGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="92%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="aiAnomGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="8%" stopColor="#f87171" stopOpacity={0.28} />
              <stop offset="90%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
            <filter id="aiSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#64748B" }} interval={3} />
          <YAxis tick={{ fontSize: 9, fill: "#64748B" }} width={28} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(56,189,248,0.25)",
              borderRadius: 10,
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="detections"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#aiDetGlow)"
            name="Detections"
            isAnimationActive
            animationDuration={520}
          />
          <Area
            type="monotone"
            dataKey="anomalies"
            stroke="#f87171"
            strokeWidth={1.6}
            fill="url(#aiAnomGlow)"
            name="Anomalies"
            isAnimationActive
            animationDuration={520}
          />
          <Line
            type="monotone"
            dataKey="modelConfidenceOverlay"
            stroke="#a78bfa"
            strokeWidth={1.4}
            dot={false}
            name="Confidence"
            filter="url(#aiSoftGlow)"
            isAnimationActive
            animationDuration={520}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const SparklineBlock = memo(function SparklineBlock({ title, data, dataKey, stroke }) {
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{title}</p>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, fontSize: 10 }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={1.8} dot={false} isAnimationActive animationDuration={420} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default function AdminAiMonitoringPage() {
  const { user } = useAuth();
  const actor = sanitizePlainText(user?.email ?? user?.fullName ?? "soc-admin", 254);

  const {
    overview,
    activity,
    classification,
    performance,
    feed,
    models,
    status,
    error,
    reload,
    silentReload,
    fetchModelDetail,
  } = useAiMonitoring({ pollMs: 7800 });

  const [drawerModelId, setDrawerModelId] = useState(null);
  const [drawerPayload, setDrawerPayload] = useState(null);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [modelActionBusy, setModelActionBusy] = useState(() => ({}));
  const [toast, setToast] = useState("");

  const m = overview?.metrics;

  const pushToast = useCallback((t) => {
    setToast(sanitizePlainText(t, 360));
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    if (!drawerModelId) {
      setDrawerPayload(null);
      return undefined;
    }
    let cancelled = false;
    setDrawerBusy(true);
    void fetchModelDetail(drawerModelId)
      .then((data) => {
        if (!cancelled) setDrawerPayload(data);
      })
      .catch((err) => {
        if (!cancelled) pushToast(normalizeSocError(err).message ?? "Model detail failed.");
      })
      .finally(() => {
        if (!cancelled) setDrawerBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drawerModelId, fetchModelDetail, pushToast]);

  const classificationSlices = useMemo(() => classification?.slices ?? [], [classification?.slices]);

  const modelAction = useCallback(
    async (id, kind) => {
      const key = `${id}-${kind}`;
      setModelActionBusy((p) => ({ ...p, [key]: true }));
      try {
        const body = { actor };
        let res;
        if (kind === "retrain") res = await socApi.aiModelRetrain(id, body);
        else if (kind === "restart") res = await socApi.aiModelRestart(id, body);
        else res = await socApi.aiModelRollback(id, body);
        if (res?.models) {
          pushToast(`${kind} queued · ${sanitizePlainText(id, 80)}`);
          void silentReload();
        }
      } catch (err) {
        pushToast(normalizeSocError(err).message ?? `${kind} failed`);
      } finally {
        setModelActionBusy((p) => ({ ...p, [key]: false }));
      }
    },
    [actor, pushToast, silentReload],
  );

  const loading = status === "loading" && !overview;
  const feedItems = feed?.items ?? [];

  const statusChip = (s) => {
    const x = String(s ?? "active").toLowerCase();
    const cls =
      x === "active"
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        : x === "warming"
          ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
          : x === "degraded"
            ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
            : x === "retraining"
              ? "bg-violet-500/15 text-violet-200 border-violet-500/30"
              : x === "offline"
                ? "bg-slate-600/25 text-slate-300 border-slate-500/25"
                : "bg-white/10 text-[#CBD5E1] border-white/15";
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
        {sanitizePlainText(x, 24)}
      </span>
    );
  };

  return (
    <div className="min-h-full space-y-4 p-4 md:p-6">
      <motion.div layout className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">AI Monitoring</h1>
          <p className="text-xs text-[#94A3AF] md:text-sm">
            Upload forensic engine · ThreatAnalysis fusion · Telemetry/SOAR correlation · Live websocket refresh
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#E5E7EB] transition hover:border-cyan-500/35 hover:bg-white/[0.07]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${healthBadgeClass(m?.healthState)}`}
          >
            {sanitizePlainText(m?.healthState ?? "—", 28)}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {m?.activeModels ?? "—"} MODELS
          </span>
        </div>
      </motion.div>

      {status === "error" ? <ErrorBanner title="AI monitoring fault" message={error ?? ""} onRetry={() => void reload()} /> : null}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Anomaly Confidence",
            value: m?.anomalyConfidence ?? 0,
            suffix: "%",
            icon: Brain,
            color: "text-cyan-400",
            trend: m?.trends?.threatRunsDelta,
            invertTrend: false,
          },
          {
            label: "Heuristic Accuracy",
            value: m?.heuristicAccuracy ?? 0,
            suffix: "%",
            icon: TrendingUp,
            color: "text-emerald-400",
            trend: m?.trends?.filesProcessedDelta,
            invertTrend: false,
          },
          {
            label: "Model Health",
            value: m?.modelHealth ?? 0,
            suffix: "%",
            icon: Activity,
            color: "text-violet-400",
            trend: m?.trends?.threatRunsDelta,
            invertTrend: true,
          },
          {
            label: "Files Processed",
            value: m?.filesProcessed ?? 0,
            suffix: "",
            icon: Layers,
            color: "text-amber-400",
            trend: m?.trends?.filesProcessedDelta,
            invertTrend: false,
          },
        ].map((card) => (
          <motion.div
            key={card.label}
            layout
            className="rounded-xl border border-white/10 bg-[#111827]/95 p-3 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.06)] transition hover:border-cyan-500/25 hover:shadow-[0_0_20px_rgba(56,189,248,0.12)]"
          >
            <card.icon className={`mb-2 h-5 w-5 ${card.color}`} aria-hidden />
            <motion.p key={`${card.label}-${card.value}`} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} className={`text-2xl font-bold tabular-nums ${card.color}`}>
              {loading ? "—" : `${card.value}${card.suffix}`}
            </motion.p>
            <p className="text-[11px] text-[#9CA3AF]">{card.label}</p>
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <span className="text-[10px] text-[#64748B]">Δ 24h footprint</span>
              <TrendDelta value={card.trend} invert={card.invertTrend} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Inference + explainability + correlation */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4 lg:col-span-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">Inference engine</p>
          <div className="space-y-2 text-xs text-[#CBD5E1]">
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3AF]">Queued scans</span>
              <span className="font-mono text-cyan-300">{overview?.inferenceEngine?.queuedScans ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3AF]">Active jobs</span>
              <span className="font-mono text-violet-300">{overview?.inferenceEngine?.activeInferenceJobs ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3AF]">State</span>
              <span className="font-mono text-amber-200">{sanitizePlainText(overview?.inferenceEngine?.scanningState ?? "—", 24)}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {(overview?.inferenceEngine?.pipelineStages ?? []).map((st) => (
                <span key={st} className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#93C5FD]">
                  {sanitizePlainText(st, 40)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4 lg:col-span-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">Explainability (72h indicators)</p>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px] text-[#CBD5E1]">
            {(overview?.explainabilitySummary?.topIndicators ?? []).length ? (
              overview.explainabilitySummary.topIndicators.map((row) => (
                <li key={row.indicator} className="flex justify-between gap-2 rounded border border-white/5 bg-white/[0.02] px-2 py-1 font-mono">
                  <span className="truncate text-[#94A3AF]">{sanitizePlainText(row.indicator, 48)}</span>
                  <span className="text-cyan-300">{row.hits}</span>
                </li>
              ))
            ) : (
              <li className="text-[#64748B]">{loading ? "Loading…" : "No indicator mass — awaiting uploads."}</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4 lg:col-span-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">Cross-module correlation</p>
          <p className="text-xs leading-relaxed text-[#CBD5E1]">{sanitizePlainText(overview?.correlation?.crossModuleNote ?? "—", 520)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <span className="text-[#64748B]">SOAR 24h</span>
              <p className="font-mono text-violet-300">{overview?.correlation?.soarPlaybookEvents24h ?? 0}</p>
            </div>
            <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <span className="text-[#64748B]">Upload pending</span>
              <p className="font-mono text-amber-300">{overview?.correlation?.uploadPipelinePending ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity + classification */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3AF]">Detection activity (24h)</p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden /> : null}
          </div>
          <AiActivityPanel series={activity?.series} />
          <p className="mt-2 text-[10px] text-[#64748B]">
            Purple overlay = rolling confidence · Red anomaly lane mirrors ThreatAnalysis suspicious spikes.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3AF]">Classification results</p>
            <span className="text-[10px] text-[#64748B]">
              Vol {classification?.volumeClassified ?? 0} · anomalies {classification?.anomalyCount ?? 0} · AI confidence{" "}
              {classification?.confidenceRange
                ? `${classification.confidenceRange.low}–${classification.confidenceRange.high}%`
                : "—"}
            </span>
          </div>
          {classificationSlices.length === 0 && !loading ? (
            <p className="py-10 text-center text-sm text-[#64748B]">No labelled classifications in the 72h window yet.</p>
          ) : (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="mx-auto h-52 w-52 shrink-0 sm:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                      isAnimationActive
                      animationDuration={640}
                    >
                      {classificationSlices.map((entry, i) => (
                        <Cell key={`${entry.name}-${i}`} stroke="rgba(15,23,42,0.9)" strokeWidth={1} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => [
                        `${value}% · ${item?.payload?.count ?? ""} samples`,
                        sanitizePlainText(name, 80),
                      ]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(167,139,250,0.35)",
                        borderRadius: 10,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {classificationSlices.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-[#CBD5E1]">{sanitizePlainText(d.name, 120)}</span>
                    <span className="shrink-0 font-mono text-[11px] text-[#FDE68A]">{d.value}%</span>
                    <span className="shrink-0 text-[10px] text-[#64748B]">n={d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#94A3AF]">Model performance · operational estimates</p>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
            <p className="text-[10px] text-emerald-200/80">Precision</p>
            <p className="text-xl font-bold tabular-nums text-emerald-300">{performance?.precision ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
            <p className="text-[10px] text-cyan-200/80">Recall</p>
            <p className="text-xl font-bold tabular-nums text-cyan-300">{performance?.recall ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3">
            <p className="text-[10px] text-violet-200/80">F1</p>
            <p className="text-xl font-bold tabular-nums text-violet-300">{performance?.f1 ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] text-[#94A3AF]">Latency avg (synthetic)</p>
            <p className="text-xl font-bold tabular-nums text-[#E5E7EB]">{m?.avgInferenceLatencyMs ?? "—"}ms</p>
          </div>
        </div>
        <p className="mb-3 text-[10px] leading-snug text-[#64748B]">{sanitizePlainText(performance?.note ?? "", 480)}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SparklineBlock title="Latency pulse" data={performance?.latencySpark} dataKey="ms" stroke="#38bdf8" />
          <SparklineBlock title="Throughput / hr" data={performance?.throughputSpark} dataKey="inferences" stroke="#a78bfa" />
          <SparklineBlock title="Drift trend" data={performance?.driftTrend} dataKey="drift" stroke="#fb923c" />
        </div>
      </div>

      {/* Models */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3AF]">Active AI models</p>
          <span className="text-[10px] text-[#64748B]">Click a card for governance drawer · Actions audit to ActivityEvent</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(models ?? []).map((model) => (
            <motion.button
              key={model.id}
              type="button"
              layout
              onClick={() => setDrawerModelId(model.id)}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-violet-400/35 hover:shadow-[0_0_18px_rgba(167,139,250,0.15)]"
            >
              <div className="flex items-start justify-between gap-2">
                <Brain className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                {statusChip(model.status)}
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{sanitizePlainText(model.displayName, 120)}</p>
              <p className="text-[11px] text-[#64748B]">{sanitizePlainText(model.version, 80)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#94A3AF]">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" aria-hidden />
                  {model.inferenceRate}/hr
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-cyan-400" aria-hidden />
                  CPU {Math.round(model.cpuUtilPct)}%
                </span>
                <span className="flex items-center gap-1">
                  <MemoryStick className="h-3 w-3 text-emerald-400" aria-hidden />
                  RAM {Math.round(model.memoryUsagePct)}%
                </span>
                <span className="font-mono text-[#CBD5E1]">{model.latencyMs}ms</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#FDE68A]">
                  drift {Math.round(model.driftScore)}
                </span>
                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#FCA5A5]">
                  FP est {model.falsePositiveRatio}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  className="rounded border border-white/10 bg-white/[0.05] px-1 py-1 text-[9px] uppercase text-[#CBD5E1] hover:border-violet-400/40"
                  disabled={modelActionBusy[`${model.id}-retrain`]}
                  onClick={(e) => {
                    e.stopPropagation();
                    void modelAction(model.id, "retrain");
                  }}
                >
                  Retrain
                </button>
                <button
                  type="button"
                  className="rounded border border-white/10 bg-white/[0.05] px-1 py-1 text-[9px] uppercase text-[#CBD5E1] hover:border-cyan-400/40"
                  disabled={modelActionBusy[`${model.id}-restart`]}
                  onClick={(e) => {
                    e.stopPropagation();
                    void modelAction(model.id, "restart");
                  }}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className="rounded border border-white/10 bg-white/[0.05] px-1 py-1 text-[9px] uppercase text-[#CBD5E1] hover:border-amber-400/40"
                  disabled={modelActionBusy[`${model.id}-rollback`]}
                  onClick={(e) => {
                    e.stopPropagation();
                    void modelAction(model.id, "rollback");
                  }}
                >
                  Rollback
                </button>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-white/10 bg-[#111827]/95 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#94A3AF]">AI detection feed</p>
        <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {feedItems.map((ev) => {
              const level = ev.level ?? "info";
              const dot =
                level === "critical"
                  ? "bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.55)]"
                  : level === "high"
                    ? "bg-orange-400"
                    : level === "medium"
                      ? "bg-amber-400"
                      : "bg-cyan-400";
              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 transition hover:border-cyan-500/25 hover:bg-white/[0.04]"
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#E5E7EB]">{sanitizePlainText(ev.msg, 640)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#64748B]">
                      <span>{new Date(ev.time).toLocaleString()}</span>
                      {ev.modelSource ? (
                        <span className="rounded bg-white/[0.06] px-1.5 font-mono text-[#93C5FD]">{sanitizePlainText(ev.modelSource, 48)}</span>
                      ) : null}
                      {ev.confidencePct != null ? (
                        <span className="rounded border border-violet-500/25 px-1.5 text-violet-200">AI {Math.round(ev.confidencePct)}%</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#94A3AF]">{sanitizePlainText(ev.type, 40)}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!feedItems.length && !loading ? (
            <p className="py-8 text-center text-sm text-[#64748B]">No AI-authored telemetries in the ingest window.</p>
          ) : null}
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerModelId ? (
          <>
            <motion.button
              type="button"
              aria-label="Close model drawer"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerModelId(null)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-violet-500/25 bg-[#0f172a] shadow-[-14px_0_40px_rgba(139,92,246,0.18)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Model governance</p>
                  <p className="font-mono text-[11px] text-[#94A3AF]">{sanitizePlainText(drawerModelId, 120)}</p>
                </div>
                <button type="button" className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-white/10 hover:text-white" onClick={() => setDrawerModelId(null)}>
                  Close
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm text-[#CBD5E1]">
                {drawerBusy ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-hidden />
                  </div>
                ) : drawerPayload ? (
                  <>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-semibold text-white">{sanitizePlainText(drawerPayload.model?.displayName, 160)}</p>
                      <p className="mt-1 text-[11px] text-[#94A3AF]">{sanitizePlainText(drawerPayload.model?.role, 320)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">{statusChip(drawerPayload.model?.status)}</div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Feature importance</p>
                      <ul className="space-y-1 text-[11px]">
                        {(drawerPayload.featureImportance ?? []).map((f) => (
                          <li key={f.feature} className="flex justify-between rounded border border-white/5 px-2 py-1 font-mono">
                            <span>{sanitizePlainText(f.feature, 80)}</span>
                            <span className="text-cyan-300">{f.weight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Explainability samples</p>
                      <ul className="space-y-1 text-[11px]">
                        {(drawerPayload.explainabilitySamples ?? []).map((s) => (
                          <li key={s.fileId} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1">
                            <span className="font-mono text-[10px] text-[#93C5FD]">{sanitizePlainText(s.fileId?.slice(0, 8), 16)}…</span>
                            <p className="text-[#CBD5E1]">{sanitizePlainText(s.why, 360)}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-[#64748B]">Recent inference logs</p>
                      <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
                        {(drawerPayload.inferenceLogs ?? []).map((log) => (
                          <li key={log.id} className="rounded border border-white/5 px-2 py-1 font-mono text-[#94A3AF]">
                            <span className="text-[#FDE68A]">{sanitizePlainText(log.stage, 40)}</span> · {sanitizePlainText(log.message, 200)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-[#64748B]">No payload.</p>
                )}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 z-[70] max-w-md rounded-lg border border-violet-500/30 bg-[#0f172a]/95 px-3 py-2 text-sm text-[#E5E7EB]"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-2 pb-4 text-[10px] text-[#475569]">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500/80" aria-hidden />
        Metrics derive from File, ThreatAnalysis, SecurityAnalysis, TelemetryLog, ActivityEvent, and SecurityEvent — not simulated RNG.
      </div>
    </div>
  );
}
