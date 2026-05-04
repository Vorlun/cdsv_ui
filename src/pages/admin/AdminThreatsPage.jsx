import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Ban, Loader2, Search, ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
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
import SoarAttackMap from "@/features/soar/SoarAttackMap";
import SoarIncidentCard from "@/features/soar/SoarIncidentCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useSoarIncidentCenter } from "@/hooks/useSoarIncidentCenter";
import { sanitizePlainText } from "@/utils/sanitize";
import { formatDisplayTimestamp } from "@/utils/auditLogSchema";
import { getSocCapabilityMatrix, normalizeSocRole } from "@/utils/socPermissions";

function sortIncidentGrid(items) {
  const rank = { investigating: 1, detected: 2, mitigated: 3, closed: 4 };
  return [...items].sort((a, b) => {
    const sla = Number(b.slaBreached ?? 0) - Number(a.slaBreached ?? 0);
    if (sla !== 0) return sla;
    const dr = (rank[a.lifecycle] ?? 9) - (rank[b.lifecycle] ?? 9);
    if (dr !== 0) return dr;
    return (b.riskScore ?? 0) - (a.riskScore ?? 0);
  });
}

function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const frames = 26;
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / frames, 1);
      setDisplay(Math.round(Number(value ?? 0) * progress));
      if (progress >= 1) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

const SoarUnifiedFeedPanel = memo(function SoarUnifiedFeedPanel({ feed = [], syncing, focusThreatId = "" }) {
  useEffect(() => {
    if (!focusThreatId) return;
    const match = feed.some((row) => String(row.id) === focusThreatId);
    if (!match) return;
    let el = null;
    try {
      el = document.querySelector(`[data-soc-feed-alert="${CSS.escape(focusThreatId)}"]`);
    } catch {
      el = Array.from(document.querySelectorAll("[data-soc-feed-alert]")).find(
        (node) => node.getAttribute("data-soc-feed-alert") === focusThreatId,
      );
    }
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusThreatId, feed]);

  return (
    <div className="h-[290px] space-y-2 overflow-y-auto pr-1">
      {syncing ? (
        <p className="mb-1 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2 text-[11px] text-[#64748B]">
          <Loader2 className="h-4 w-4 animate-spin text-[#38BDF8]" aria-hidden /> Merging stream…
        </p>
      ) : null}
      {focusThreatId && feed.some((row) => String(row.id) === focusThreatId) ? (
        <p className="mb-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[11px] text-[#A5F3FC]">
          Cross-linked from ingestion POP — highlighting alert{" "}
          <span className="font-mono text-[11px] text-white">{sanitizePlainText(focusThreatId, 120)}</span>
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {feed.map((item) => (
          <motion.div
            key={item.id}
            layout
            data-soc-feed-alert={item.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`rounded-lg border bg-[#0F172A]/80 px-3 py-2 text-xs ${
              focusThreatId && String(item.id) === focusThreatId
                ? "border-cyan-400/70 ring-2 ring-cyan-400/45"
                : "border-white/10"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={
                  item.severity === "Critical"
                    ? "text-[#FCA5A5]"
                    : item.severity === "High"
                      ? "text-[#FDBA74]"
                      : "text-[#FDE68A]"
                }
              >
                {sanitizePlainText(item.severity, 28)}
              </span>
              <span className="text-[10px] text-[#64748B]">{sanitizePlainText(item.time, 32)}</span>
            </div>
            <div className="text-[#D1D5DB]">{sanitizePlainText(item.text, 520)}</div>
            {"source" in item && (
              <div className="mt-1 text-[10px] uppercase tracking-wide text-[#475569]">
                {sanitizePlainText(item.source ?? "", 20)}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {!feed.length ? (
        <EmptyState title="Feed nominal" description="Correlated playbook events will enqueue here automatically." />
      ) : null}
    </div>
  );
});

const SoarAuditTrail = memo(function SoarAuditTrail({ entries, emptyHint = "No analyst actions logged yet." }) {
  if (!entries?.length) return <p className="text-[11px] text-[#64748B]">{emptyHint}</p>;
  return (
    <ul className="max-h-24 space-y-1 overflow-y-auto pr-1">
      {entries.slice(0, 8).map((e) => (
        <li
          key={e.id}
          className="flex flex-wrap items-baseline gap-x-2 rounded border border-white/5 bg-[#0F172A]/90 px-2 py-1 font-mono text-[10px] text-[#CBD5E1]"
        >
          <span className="text-[#93C5FD]">{sanitizePlainText(e.actor, 200)}</span>
          <span className="text-[#64748B]">{formatDisplayTimestamp(e.at)}</span>
          <span className="text-[#FB923C]">{sanitizePlainText(e.action, 24)}</span>
          <span className="min-w-0 flex-1 truncate text-[#94A3B8]" title={sanitizePlainText(e.detail, 400)}>
            {sanitizePlainText(e.detail, 180)}
          </span>
        </li>
      ))}
    </ul>
  );
});

const PlaybookEngineAudit = memo(function PlaybookEngineAudit({ entries }) {
  if (!entries?.length) {
    return <p className="text-[11px] text-[#64748B]">Awaiting playbook triggers…</p>;
  }
  return (
    <ul className="max-h-28 space-y-1 overflow-y-auto pr-1">
      {entries.slice(0, 10).map((e) => (
        <li
          key={e.id}
          className="rounded border border-[#F97316]/25 bg-[#F97316]/08 px-2 py-1 font-mono text-[10px] text-[#FED7AA]"
        >
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[#FB923C]">{sanitizePlainText(e.ruleId, 96)}</span>
            <span className="text-[#92400E]/90">{formatDisplayTimestamp(e.at)}</span>
            <span className="font-semibold">{sanitizePlainText(e.outcome, 80)}</span>
          </div>
          <div className="truncate text-[#FFEDD5]" title={sanitizePlainText(e.detail, 440)}>
            {sanitizePlainText(e.detail, 200)}
          </div>
          {e.targetIp ? (
            <div className="text-[#FDBA74]">{sanitizePlainText(e.targetIp, 45)}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
});

export default function AdminThreatsPage() {
  const [searchParams] = useSearchParams();
  const focusThreatCrossLink = sanitizePlainText(searchParams.get("focusThreat") ?? "", 140);
  const { user } = useAuth();
  const actor = sanitizePlainText(user?.email ?? user?.fullName ?? "soc.analyst@lab", 254);
  const socRole = normalizeSocRole(user?.socRole);
  const incidentSocGates = useMemo(() => {
    const c = getSocCapabilityMatrix(socRole);
    return {
      investigate: c.canInvestigateThreat,
      block: c.canMitigateThreat,
      ignore: c.canDismissThreat,
      assign: c.canAssignIncident,
    };
  }, [socRole]);
  const { snapshot, status, error, actionBusy, runAction, retry } = useSoarIncidentCenter({
    streamIntervalMs: 5500,
    socRole,
  });
  const [toast, setToast] = useState("");
  const [activeInvestigation, setActiveInvestigation] = useState(null);
  const [activeMixIndex, setActiveMixIndex] = useState(0);

  const pushToast = useCallback((t) => {
    setToast(sanitizePlainText(t, 380));
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const sortedIncidents = useMemo(() => sortIncidentGrid(snapshot?.incidents ?? []), [snapshot?.incidents]);

  const metrics = useMemo(() => {
    const m = snapshot?.metrics;
    if (!m) {
      return [
        { label: "Detecting", value: 0, icon: ShieldAlert, color: "text-[#FCA5A5]" },
        { label: "Investigating", value: 0, icon: Search, color: "text-[#FDE68A]" },
        { label: "Mitigated", value: 0, icon: Ban, color: "text-[#6EE7B7]" },
        { label: "Global Risk Score", value: 0, icon: AlertTriangle, color: "text-[#FDBA74]" },
      ];
    }
    return [
      { label: "Detecting", value: m.detecting, icon: ShieldAlert, color: "text-[#FCA5A5]" },
      { label: "Investigating", value: m.investigating, icon: Search, color: "text-[#FDE68A]" },
      { label: "Mitigated", value: m.mitigated, icon: Ban, color: "text-[#6EE7B7]" },
      { label: "Global Risk Score", value: m.globalRiskScore ?? 0, icon: AlertTriangle, color: "text-[#FDBA74]" },
    ];
  }, [snapshot?.metrics]);

  const attackMix = snapshot?.attackMix ?? [];
  const timeline = snapshot?.timeline ?? [];
  const topCountries = snapshot?.topCountries ?? [];

  const openInvestigation = useCallback(
    async (id, currentLifecycle) => {
      if (currentLifecycle === "investigating") {
        const inc = snapshot?.incidents?.find((x) => x.id === id);
        if (inc) {
          setActiveInvestigation({
            ...inc,
            attemptsGraph: [
              { tick: "T-4", value: Math.max(3, Math.round(inc.attempts * 0.25)) },
              { tick: "T-3", value: Math.max(5, Math.round(inc.attempts * 0.42)) },
              { tick: "T-2", value: Math.max(8, Math.round(inc.attempts * 0.58)) },
              { tick: "T-1", value: Math.max(10, Math.round(inc.attempts * 0.78)) },
              { tick: "Now", value: inc.attempts },
            ],
          });
        }
        return;
      }

      const res = await runAction(id, "investigate", actor);
      if (!res.ok) {
        pushToast(res.message ?? "Investigate failed");
        return;
      }
      const inc = res.snapshot?.incidents?.find((x) => x.id === id);
      if (inc) {
        setActiveInvestigation({
          ...inc,
          attemptsGraph: [
            { tick: "T-4", value: Math.max(3, Math.round(inc.attempts * 0.25)) },
            { tick: "T-3", value: Math.max(5, Math.round(inc.attempts * 0.42)) },
            { tick: "T-2", value: Math.max(8, Math.round(inc.attempts * 0.58)) },
            { tick: "T-1", value: Math.max(10, Math.round(inc.attempts * 0.78)) },
            { tick: "Now", value: inc.attempts },
          ],
        });
      }
      pushToast(`Investigation opened · ${sanitizePlainText(actor, 120)}`);
    },
    [actor, runAction, snapshot?.incidents, pushToast],
  );

  const blockThreat = useCallback(
    async (id) => {
      const res = await runAction(id, "block", actor);
      if (res.ok) {
        pushToast(`Mitigated / sinkhole · ${sanitizePlainText(actor, 120)}`);
        if (activeInvestigation?.id === id) setActiveInvestigation(null);
      } else pushToast(res.message ?? "Block failed");
    },
    [actor, runAction, activeInvestigation?.id, pushToast],
  );

  const ignoreThreat = useCallback(
    async (id) => {
      const res = await runAction(id, "ignore", actor);
      if (res.ok) {
        pushToast(`Dismissed / low priority · ${sanitizePlainText(actor, 120)}`);
        if (activeInvestigation?.id === id) setActiveInvestigation(null);
      } else pushToast(res.message ?? "Dismiss failed");
    },
    [actor, runAction, activeInvestigation?.id, pushToast],
  );

  const assignIncident = useCallback(
    async (incidentId, assigneeEmail) => {
      const who = sanitizePlainText(assigneeEmail, 254);
      const res = await runAction(incidentId, "assign", actor, { assigneeEmail: who });
      if (res.ok) pushToast(`Assigned to ${sanitizePlainText(who, 180)}`);
      else pushToast(res.message ?? "Assignment rejected");
    },
    [actor, runAction, pushToast],
  );

  const loading = status === "loading";
  const totalIncidents = sortedIncidents.length;

  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-10 h-[420px] w-[420px] rounded-full bg-[#EF4444]/10 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-24 h-[420px] w-[420px] rounded-full bg-[#3B82F6]/12 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 8, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-white/10 bg-[#0F172A]/90 p-5 shadow-[0_0_24px_rgba(59,130,246,0.14)]">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">SOAR Threat Command</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Orchestrated response — correlated from the same <code className="text-[#93C5FD]">liveLogs</code> buffer as
            SIEM Audit Center. Stream shard {snapshot?.iterations ?? "—"}.
          </p>
        </section>

        {status === "error" ? (
          <ErrorBanner title="SOAR snapshot fault" message={error ?? ""} onRetry={() => void retry()} />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-[#EF4444]/20 bg-white/[0.04] p-4 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(249,115,22,0.18)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{metric.label}</span>
                  <span className="rounded-lg border border-white/10 bg-[#0B1220] p-2">
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {loading ? "—" : <AnimatedCount value={metric.value} />}
                </div>
                <div className="mt-1 text-xs text-[#FDBA74]">Rolling window · GET /soar/snapshot</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 rounded-xl border border-white/10 bg-[#111827]/80 p-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3AF]">
              Analyst audit trail
            </div>
            <SoarAuditTrail entries={snapshot?.auditTrail} emptyHint="No manual playbook steps yet." />
          </div>
          <div className="md:border-l md:border-white/5 md:pl-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#FB923C]">
              Automated playbook engine
            </div>
            <PlaybookEngineAudit entries={snapshot?.playbookAudit} />
          </div>
          <div className="md:col-span-2 mt-1 text-[10px] text-[#475569]">
            Active investigation IDs: {(snapshot?.activeInvestigations ?? []).slice(0, 6).join(", ") || "—"} · Blocked IP
            objects: {snapshot?.blockedIpCount ?? 0}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Attack surface (log-derived)</div>
            {loading && !snapshot ? (
              <div className="flex h-[290px] items-center justify-center text-[#64748B]">
                <Loader2 className="h-8 w-8 animate-spin text-[#38BDF8]" aria-hidden />
              </div>
            ) : (
              <SoarAttackMap mapPoints={snapshot?.mapPoints ?? []} streamEpoch={snapshot?.iterations ?? 0} />
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Unified threat feed</div>
            <SoarUnifiedFeedPanel
              feed={snapshot?.unifiedFeed ?? []}
              syncing={loading && snapshot == null}
              focusThreatId={focusThreatCrossLink}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[#E5E7EB]">Correlated incidents (IP · principal campaigns)</div>
            <span className="text-xs text-[#64748B]">
              Closed / dismissed shown muted · {totalIncidents} objects
            </span>
          </div>
          {loading && !snapshot ? (
            <div className="flex justify-center py-16 text-[#64748B]">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
          ) : !sortedIncidents.length ? (
            <EmptyState title="No qualifying campaigns" description="Thresholds not met in current log buffer." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedIncidents.map((inc) => (
                <SoarIncidentCard
                  key={inc.id}
                  incident={inc}
                  eligibleAssignees={snapshot?.eligibleAssignees ?? []}
                  gates={incidentSocGates}
                  onInvestigate={(id, lifecycle) => void openInvestigation(id, lifecycle)}
                  onBlock={(id) => void blockThreat(id)}
                  onIgnore={(id) => void ignoreThreat(id)}
                  onAssignOwner={(id, email) => void assignIncident(id, email)}
                  loadingInvestigate={Boolean(actionBusy[`${inc.id}-investigate`])}
                  loadingBlock={Boolean(actionBusy[`${inc.id}-block`])}
                  loadingIgnore={Boolean(actionBusy[`${inc.id}-ignore`])}
                  loadingAssign={Boolean(actionBusy[`${inc.id}-assign`])}
                />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Campaign mix</div>
            <div className="grid items-center gap-2 md:grid-cols-[1fr_1fr]">
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attackMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                      isAnimationActive
                      animationDuration={750}
                      onMouseEnter={(_, idx) => setActiveMixIndex(idx)}
                    >
                      {attackMix.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke={index === activeMixIndex ? "#F8FAFC" : "transparent"}
                          strokeWidth={index === activeMixIndex ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wide text-[#64748B]">Correlated threats</span>
                  <span className="text-3xl font-bold text-white">
                    <AnimatedCount value={totalIncidents} />
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {attackMix.map((item, idx) => (
                  <div
                    key={item.name}
                    className={`rounded-lg border px-2.5 py-2 text-xs transition ${
                      activeMixIndex === idx
                        ? "border-[#F8FAFC]/30 bg-[#0F172A]/90 shadow-[0_0_16px_rgba(248,250,252,0.1)]"
                        : "border-white/10 bg-[#0F172A]/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[#D1D5DB]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        {sanitizePlainText(item.name, 80)}
                      </span>
                      <span className="text-[#FDE68A]">
                        <AnimatedCount value={item.value} />%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Correlation timeline</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="threats"
                    stroke="#F97316"
                    strokeWidth={2.4}
                    dot={{ r: 3, fill: "#F97316" }}
                    isAnimationActive
                    animationDuration={700}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:col-span-1">
            <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">Geographic pressure (logs)</div>
            <div className="space-y-2">
              {(topCountries.length ? topCountries : [{ country: "—", count: 0 }]).map((row, index) => (
                <div
                  key={row.country}
                  className="rounded-lg border border-white/10 bg-[#0F172A]/70 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]"
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">#{index + 1}</span>
                    <span className="text-[#FDE68A]">{row.count}</span>
                  </div>
                  <div className="mb-1 text-sm text-[#E5E7EB]">{sanitizePlainText(row.country, 80)}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, topCountries[0]?.count ? (row.count / topCountries[0].count) * 100 : 0)}%`,
                      }}
                      transition={{ duration: 0.45, delay: index * 0.04 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#22D3EE]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activeInvestigation ? (
          <>
            <motion.button
              type="button"
              onClick={() => setActiveInvestigation(null)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[430px] flex-col border-l border-[#EF4444]/30 bg-[#0F172A] shadow-[-18px_0_45px_rgba(239,68,68,0.14)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-white">Investigation</div>
                  <div className="text-xs text-[#94A3B8]">{sanitizePlainText(activeInvestigation.id, 96)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInvestigation(null)}
                  className="rounded px-2 py-1 text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm text-[#D1D5DB]">
                <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                  <div className="text-[#BFDBFE]">{sanitizePlainText(activeInvestigation.headline ?? activeInvestigation.type, 280)}</div>
                  <div className="mt-2 font-mono text-[#93C5FD]">{sanitizePlainText(activeInvestigation.ip, 45)}</div>
                  <div className="text-xs text-[#94A3B8]">
                    Lifecycle: {sanitizePlainText(activeInvestigation.lifecycle, 24)} · Risk {activeInvestigation.riskScore}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#111827]/70 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#94A3B8]">Event cadence</div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeInvestigation.attemptsGraph ?? []}>
                        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                        <XAxis dataKey="tick" stroke="#64748B" />
                        <YAxis stroke="#64748B" />
                        <Tooltip
                          contentStyle={{ background: "#0B1220", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}
                        />
                        <Bar dataKey="value" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  disabled={!incidentSocGates.block}
                  onClick={() => void blockThreat(activeInvestigation.id)}
                  className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-2 text-xs text-[#FCA5A5] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Mitigate / Block
                </button>
                <button
                  type="button"
                  disabled={!incidentSocGates.ignore}
                  onClick={() => void ignoreThreat(activeInvestigation.id)}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-xs text-[#CBD5E1] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Dismiss noise
                </button>
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
            className="fixed bottom-4 right-4 z-[80] max-w-md rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(59,130,246,0.24)]"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
