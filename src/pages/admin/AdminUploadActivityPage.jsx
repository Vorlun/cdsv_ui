import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileLock2,
  Loader2,
  MoreHorizontal,
  Radio,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserPlus,
  XCircle,
  AlertOctagon,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import PageContainer from "@/components/ui/PageContainer";
import SectionHeader from "@/components/ui/SectionHeader";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionMenu from "@/components/ui/ActionMenu";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUploadSecurityLab } from "@/hooks/useUploadSecurityLab";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { sanitizePlainText } from "@/utils/sanitize";
import { getSocCapabilityMatrix, normalizeSocRole } from "@/utils/socPermissions";

const uploadTimeline = [
  { time: "08:00", volume: 12 },
  { time: "09:00", volume: 18 },
  { time: "10:00", volume: 26 },
  { time: "11:00", volume: 21 },
  { time: "12:00", volume: 31 },
  { time: "13:00", volume: 28 },
];

const fileTypesChart = [
  { name: "CSV", value: 26, color: "#3B82F6" },
  { name: "JSON", value: 20, color: "#22D3EE" },
  { name: "PDF", value: 18, color: "#10B981" },
  { name: "ZIP", value: 14, color: "#F59E0B" },
  { name: "EXE/BAT", value: 22, color: "#EF4444" },
];

const ANALYST_PRESETS = [
  "soc.viewer@test.com",
  "admin@test.com",
  "user@test.com",
  "reviewer@test.com",
];

/** Rich analyst guidance for the four explainability-heavy gate stages. */
const SCHEMA_TOOLTIP_KEYS = new Set(["encryption", "malware", "policy", "decision"]);

function riskColorTone(risk) {
  if (risk === "Low") return "text-[#6EE7B7]";
  if (risk === "Medium") return "text-[#FDE68A]";
  return "text-[#FCA5A5]";
}

function decisionTone(decision) {
  if (decision === "allow") return "success";
  if (decision === "review") return "warning";
  return "danger";
}

function formatClock(iso) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "--:--";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function stageAccent(status) {
  if (status === "pass") return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.45)]";
  if (status === "warn") return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.38)]";
  if (status === "fail") return "bg-red-500 shadow-[0_0_12px_rgba(248,113,113,.42)]";
  if (status === "neutral") return "bg-slate-600/70";
  return "bg-slate-500/60";
}

function deriveSocBridgePresentation(job) {
  const inv = String(job.investigationStatus ?? "none");
  if (inv === "resolved") {
    return {
      state: "resolved",
      label: "Resolved",
      hint: "SOC/IR formally closed this artefact.",
      className: "text-[#6EE7B7]",
    };
  }
  if (job.threatEscalated) {
    const hot =
      job.scanResult === "Threat" || job.finalDecision === "block" || job.compositeRisk === "High";
    if (hot) {
      return {
        state: "escalated",
        label: "Escalated",
        hint: job.linkedThreatAlertId
          ? `Critical path · ${job.linkedThreatAlertId}`
          : "High-yield telemetry auto-escalated into SOAR.",
        className: "text-[#FCA5A5]",
      };
    }
    return {
      state: "pushed_soc",
      label: "Pushed to SOC",
      hint: "Threat Monitor fan-out + playbook audit trail active.",
      className: "text-[#FDE68A]",
    };
  }
  if (inv === "pending" || job.finalDecision === "review" || job.scanResult !== "Safe") {
    return {
      state: "queued",
      label: "Queued",
      hint: "Awaiting analyst disposition / bridge action.",
      className: "text-[#93C5FD]",
    };
  }
  return {
    state: "cleared",
    label: "Cleared · nominal",
    hint: "No SOC correlation — policy-allowed ingress.",
    className: "text-[#64748B]",
  };
}

function AttackChainStrip({ job }) {
  const threatStageHot =
    job.scanResult === "Threat" ||
    job.finalDecision === "block" ||
    (job.scanResult === "Review" && job.finalDecision === "review");
  const soarHot = Boolean(job.threatEscalated || job.linkedThreatAlertId);
  const steps = [
    { key: "upload", label: "Upload", tone: "ok", caption: "POP intake" },
    {
      key: "scan",
      label: "Scan",
      tone: "ok",
      caption: "AV / policy / risk",
    },
    {
      key: "threat",
      label: "Threat",
      tone: threatStageHot ? "hot" : "idle",
      caption: threatStageHot ? "Non-safe verdict" : "No auto-threat",
    },
    {
      key: "soar",
      label: "SOAR",
      tone: soarHot ? "soar" : "idle",
      caption: soarHot ? "Orchestration" : "Not bridged",
    },
  ];

  function chipClass(tone) {
    if (tone === "ok") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
    if (tone === "hot") return "border-red-400/35 bg-red-500/15 text-red-100";
    if (tone === "soar") return "border-cyan-400/40 bg-cyan-500/15 text-cyan-100";
    return "border-white/10 bg-white/[0.04] text-[#64748B]";
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B1220]/80 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Attack-chain trace (northbound lab)</div>
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex flex-wrap items-center gap-1">
            {idx > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-[#475569]" aria-hidden /> : null}
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${chipClass(step.tone)}`}
                title={step.caption}
              >
                {step.label}
              </span>
              <span className="text-[9px] text-[#475569]">{step.caption}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineDots({ stages, schema }) {
  const ordered = [...(stages ?? [])];
  const meta = new Map((schema ?? []).map((row) => [row.key, row]));
  return (
    <div className="flex items-center gap-1" aria-label="Pipeline telemetry per ingestion stage">
      {ordered.map((s) => {
        const sch = meta.get(s.key);
        const rich = SCHEMA_TOOLTIP_KEYS.has(s.key);
        const hint = rich
          ? [sch?.label, sch?.tooltip, s.detail || s.headline].filter(Boolean).join(" · ")
          : [s.headline, s.detail].filter(Boolean).join(" · ");
        return (
          <span
            key={s.key}
            title={hint}
            className={`inline-block h-2.5 w-2.5 shrink-0 cursor-help rounded-full ${stageAccent(s.status)}`}
          />
        );
      })}
    </div>
  );
}

function PipelineDetail({ job, schema }) {
  const list = [...(schema ?? [])].sort((a, b) => a.order - b.order);
  const byKey = new Map((job.stages ?? []).map((row) => [row.key, row]));
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#0B1220]/80 p-3">
      {list.map((step) => {
        const outcome = byKey.get(step.key);
        const tip = SCHEMA_TOOLTIP_KEYS.has(step.key)
          ? [step.label, step.tooltip, outcome?.detail].filter(Boolean).join(" — ")
          : undefined;
        return (
          <div key={step.key} className="flex gap-3" title={tip}>
            <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center border border-white/10 ${stageAccent(outcome?.status ?? "neutral")}`}>
              {outcome?.status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-[#052e1b]" /> : null}
              {outcome?.status === "warn" ? <Shield className="h-3.5 w-3.5 text-[#422006]" /> : null}
              {outcome?.status === "fail" ? <XCircle className="h-3.5 w-3.5 text-[#450a0a]" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#E2E8F0]">{step.label}</div>
              <div className="text-[11px] font-medium text-[#93C5FD]">{outcome?.headline ?? "—"}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-[#94A3B8]">{outcome?.detail ?? ""}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminUploadActivityPage() {
  const { user } = useAuth();
  const actor = sanitizePlainText(String(user?.email ?? user?.name ?? ""), 254).trim().toLowerCase() || "admin@test.com";
  const socPersona = normalizeSocRole(user?.socRole);
  const uploadCaps = useMemo(() => getSocCapabilityMatrix(socPersona), [socPersona]);
  const { feed, loading, error, refresh, applyAction, simulateLabUpload } = useUploadSecurityLab({
    actorPrincipal: actor,
    socRole: socPersona,
  });

  const [activeMenu, setActiveMenu] = useState(null);
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [assignDraft, setAssignDraft] = useState(ANALYST_PRESETS[0]);

  const menuRef = useRef(null);
  const pageSize = 8;

  const uploads = feed?.jobs ?? [];
  const schema = feed?.pipelineSchema ?? [];

  useEffect(() => {
    const onMouseDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selectedJob = useMemo(() => uploads.find((row) => row.id === selectedId) ?? null, [uploads, selectedId]);

  const metrics = useMemo(() => {
    const totalSize = uploads.reduce((sum, item) => sum + (Number(item.sizeMb) || 0), 0);
    const encrypted = uploads.filter((item) => item.encryption === "Encrypted").length;
    const suspicious = uploads.filter((item) => item.scanResult !== "Safe").length;
    const failed = uploads.filter((item) => item.scanResult === "Threat" || item.blocked || item.finalDecision === "block").length;
    return [
      { label: "Files (lab buffer)", value: uploads.length, icon: UploadCloud, tone: "primary", trend: "POP simulation" },
      { label: "Total payload (MB)", value: `${Math.round(totalSize * 10) / 10} MB simulated`, tone: "primary", trend: "Quarantine-aware metering" },
      { label: "Encrypted posture OK", value: encrypted, icon: ShieldCheck, tone: "success", trend: "Attestation envelopes" },
      { label: "Non-safe scans", value: suspicious, icon: AlertTriangle, tone: "warning", trend: "AV + heuristic fusion" },
      { label: "Hard blocks · threats", value: failed, icon: XCircle, tone: "danger", trend: "Policy + SOC bridge" },
    ];
  }, [uploads]);

  const suspiciousFeed = useMemo(() => {
    return uploads
      .filter((u) => u.scanResult !== "Safe" || u.finalDecision !== "allow" || u.threatEscalated)
      .slice(0, 9)
      .map((u) => ({
        id: u.id,
        alertId: u.linkedThreatAlertId ? sanitizePlainText(String(u.linkedThreatAlertId), 140) : "",
        text: sanitizePlainText(`${u.fileName} · ${u.scanResult} · ${String(u.finalDecision ?? "").toUpperCase()} · risk ${u.compositeRisk}`, 400),
        severity: u.scanResult === "Threat" || u.finalDecision === "block" ? "Threat" : "Review",
        time: formatClock(u.updatedAt),
      }));
  }, [uploads]);

  const pageCount = Math.max(1, Math.ceil(uploads.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedUploads = uploads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  };

  async function ingestLocalSelection(fileList) {
    let first;
    if (Array.isArray(fileList)) first = fileList[0];
    else first = fileList?.item?.(0) ?? fileList?.[0];
    if (!first?.name) {
      showToast("No transferable filename surfaced — drag a lab specimen.");
      return;
    }
    const safe = sanitizePlainText(first.name.replace(/^.*[/\\]/, "").trim(), 220);
    setBusyId("sim");
    try {
      await simulateLabUpload({
        fileName: safe,
        sizeMb: 0.2 + Math.random() * 6,
        uploadedByEmail: actor,
        actor,
      });
      showToast(`Ingest queued · ${safe}`);
      setPage(1);
    } catch (err) {
      showToast(normalizeSocError(err)?.message ?? "Simulated POP rejected specimen.");
    } finally {
      setBusyId("");
    }
  }

  async function execUploadAction(uploadId, action, extra = {}) {
    setBusyId(uploadId);
    try {
      await applyAction({
        uploadId,
        action,
        actor,
        ...extra,
      });
      showToast(`Action '${action}' committed to audit ledger`);
    } catch (err) {
      showToast(normalizeSocError(err)?.message ?? "Action declined by gateway simulator.");
    } finally {
      setBusyId("");
      setActiveMenu(null);
    }
  }

  const relatedAudit =
    selectedJob && Array.isArray(feed?.audit)
      ? feed.audit.filter((entry) => entry.uploadId === selectedJob.id).slice(0, 10)
      : [];

  return (
    <PageContainer
      title="Secure Upload Processing Center"
      subtitle="Northbound ingestion POP · encryption posture, layered malware telemetry, OSS policy fusion, SOC publish path."
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-10 h-[360px] w-[360px] rounded-full bg-[#3B82F6]/10 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, -12, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-24 h-[360px] w-[360px] rounded-full bg-[#22D3EE]/10 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 10, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative space-y-4">
        {error ? (
          <ErrorBanner
            message={normalizeSocError(error).message ?? "SOC gateway rejected POP pull."}
            actionLabel={loading ? undefined : "Retry"}
            onAction={loading ? undefined : refresh}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#111827]/60 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Radio className="h-3.5 w-3.5 text-[#6EE7B7]" aria-hidden />
            <span>Nightly fan-out aligns with SOC stream · synthetic POP specimens every broadcast tick (~28%).</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={refresh}
            className="rounded-lg border border-white/15 px-2 py-1 text-xs text-[#BFDBFE] transition hover:border-[#3B82F6]/40 hover:bg-[#1E293B]/80 disabled:opacity-50"
          >
            Refresh ingest buffer
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              trend={metric.trend}
              tone={metric.tone}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <SectionHeader title="Simulated Ingress Volume Timeline" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uploadTimeline}>
                  <defs>
                    <linearGradient id="uploadLineSecure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <RechartsTooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="volume" stroke="#22D3EE" strokeWidth={2.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <SectionHeader title="Declared File-Type Mix" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fileTypesChart} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {fileTypesChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-3 p-0">
            <SectionHeader title="Ingress jobs · pipeline & governance" />

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0F172A]/90">
              {loading && !feed ? (
                <div className="flex items-center gap-3 px-4 py-8 text-sm text-[#93C5FD]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading ingestion POP telemetry…
                </div>
              ) : (
                <DataTable
                  columns={[
                    "Lab object",
                    "Uploader · principal",
                    "Size",
                    "Crypto",
                    "AV verdict",
                    "Disposition",
                    "Risk",
                    "SOC bridge",
                    "Trajectory",
                    "Actions",
                  ]}
                >
                  {pagedUploads.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-white/5 text-sm text-[#E5E7EB] transition hover:bg-[#1A2436]/65 ${index % 2 === 0 ? "bg-[#0F172A]/45" : "bg-[#111827]/55"}`}
                    >
                      <td className="px-3 py-3 align-top font-medium leading-snug">{row.fileName}</td>
                      <td className="px-3 py-3 align-top text-[#C7D2FE]">{row.uploadedByEmail}</td>
                      <td className="whitespace-nowrap px-3 py-3 align-top">{Number(row.sizeMb).toFixed(1)} MB</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadge tone={row.encryption === "Encrypted" ? "success" : "warning"}>{row.encryption}</StatusBadge>
                          <FileLock2 className="h-3.5 w-3.5 text-[#64748B]" aria-hidden />
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusBadge tone={row.scanResult === "Safe" ? "success" : row.scanResult === "Review" ? "warning" : "danger"}>
                          {row.scanResult}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusBadge tone={decisionTone(row.finalDecision)}>
                          {String(row.finalDecision ?? "—")}
                        </StatusBadge>
                      </td>
                      <td className={`px-3 py-3 align-top font-medium ${riskColorTone(row.compositeRisk)}`}>{row.compositeRisk}</td>
                      <td className="px-3 py-3 align-top">
                        {(() => {
                          const sb = deriveSocBridgePresentation(row);
                          return (
                            <div className="flex flex-col gap-1 text-[11px]">
                              <span className={`font-semibold ${sb.className}`} title={sb.hint}>
                                {sb.label}
                              </span>
                              {sb.state === "pushed_soc" || sb.state === "escalated" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#94A3B8]">
                                  <Send className="h-3 w-3 shrink-0" aria-hidden /> SOAR playbook
                                </span>
                              ) : null}
                              {row.linkedThreatAlertId ? (
                                <Link
                                  to={`/admin/threats?focusThreat=${encodeURIComponent(String(row.linkedThreatAlertId))}`}
                                  className="text-[10px] text-cyan-300 underline-offset-4 hover:text-cyan-100 hover:underline"
                                >
                                  Open alert
                                </Link>
                              ) : null}
                              {row.assignedToEmail ? (
                                <span title={row.assignedToEmail} className="truncate max-w-[9rem] text-[#A5B4FC]">
                                  @{row.assignedToEmail.replace(/@.+$/, "")}
                                </span>
                              ) : null}
                              {row.blockedByEmail ? <span className="text-[#FCA5A5]">Blocked by {row.blockedByEmail}</span> : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <PipelineDots stages={row.stages} schema={schema} />
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => setSelectedId(row.id)}
                            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#93C5FD] hover:border-[#3B82F6]/35"
                          >
                            Stages
                          </button>
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap px-3 py-3 align-middle" ref={activeMenu === row.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setActiveMenu((prev) => (prev === row.id ? null : row.id))}
                          className="rounded-md border border-white/10 p-1.5 text-[#9CA3AF] hover:border-[#3B82F6]/35 hover:text-[#BFDBFE]"
                          aria-expanded={activeMenu === row.id}
                          aria-label="Ingress actions menu"
                          disabled={busyId === row.id}
                        >
                          {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MoreHorizontal className="h-4 w-4" />}
                        </button>
                        <ActionMenu
                          open={activeMenu === row.id}
                          onClose={() => setActiveMenu(null)}
                          items={[
                            {
                              icon: <AlertOctagon className="h-3.5 w-3.5" />,
                              label: "Threat · block file",
                              className: "text-[#FCA5A5]",
                              disabled: !uploadCaps.canUploadThreatBlock,
                              onClick: () => execUploadAction(row.id, "threat_block"),
                            },
                            {
                              icon: <ShieldAlert className="h-3.5 w-3.5" />,
                              label: "Threat · publish to SOC / SOAR",
                              className: "text-[#FDE68A]",
                              disabled: !uploadCaps.canUploadThreatBridge,
                              onClick: () => execUploadAction(row.id, "threat_send_bridge"),
                            },
                            {
                              icon: <UserPlus className="h-3.5 w-3.5" />,
                              label: "Review · assign analyst queue",
                              disabled: !uploadCaps.canUploadReviewAssign,
                              onClick: async () =>
                                execUploadAction(row.id, "review_assign", { assigneeEmail: sanitizePlainText(assignDraft, 254) }),
                            },
                            {
                              icon: <CircleDot className="h-3.5 w-3.5" />,
                              label: "Review · pending investigation marker",
                              disabled: !uploadCaps.canUploadReviewPending,
                              onClick: () => execUploadAction(row.id, "review_mark_pending"),
                            },
                            {
                              icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                              label: "Review · resolve investigation",
                              disabled: !uploadCaps.canUploadReviewResolve,
                              onClick: () => execUploadAction(row.id, "review_resolve"),
                              className: "text-[#6EE7B7]",
                            },
                            {
                              icon: <Ban className="h-3.5 w-3.5" />,
                              label: "Operational · refresh telemetry",
                              onClick: refresh,
                              className: "text-[#A5B4FC]",
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2 text-sm text-[#9CA3AF]">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, uploads.length)} of {uploads.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                  className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4">
              <SectionHeader title="Immutable audit excerpts (SOC retention)" />
              <p className="mb-3 text-[11px] text-[#94A3B8]">
                Every operator intervention is attributable: block, bridge, assignment, backlog markers inherit your session principal ({actor}).
              </p>
              <div className="grid max-h-48 gap-2 overflow-auto text-[11px]">
                {(feed?.audit ?? []).slice(0, 12).map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/5 bg-[#0F172A]/90 px-2 py-1.5 text-[#E2E8F0]">
                    <div className="flex flex-wrap gap-2 text-[10px] text-[#64748B]">
                      <span>{formatClock(a.at)}</span>
                      <span>{a.actor}</span>
                      <span className="rounded bg-white/10 px-1">{a.action}</span>
                    </div>
                    <div className="mt-1">{a.detail}</div>
                    <div className="truncate text-[#475569]">#{a.uploadId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="rounded-2xl border border-[#EF4444]/25 bg-[#111827]/95 p-4">
              <SectionHeader title="SOC · suspicious ingress lane" />
              <div className="space-y-2">
                {suspiciousFeed.length === 0 ? (
                  <p className="text-xs text-[#64748B]">POP lab nominal — awaiting non-safe uploads.</p>
                ) : null}
                {suspiciousFeed.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2.5 text-xs">
                    <div
                      className={`mb-1 inline-flex items-center gap-1 ${item.severity === "Threat" ? "text-[#FCA5A5]" : "text-[#FDE68A]"}`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> {item.severity}
                    </div>
                    <div className="leading-5 text-[#E2E8F0]">{item.text}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[#64748B]">
                      <span>{item.time} local</span>
                      {item.alertId ? (
                        <Link
                          to={`/admin/threats?focusThreat=${encodeURIComponent(item.alertId)}`}
                          className="inline-flex items-center gap-1 rounded border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/15"
                        >
                          Threat Monitor
                          <ChevronRight className="h-3 w-3" aria-hidden />
                        </Link>
                      ) : (
                        <span className="text-[10px] text-[#475569]">No SOC alert linkage</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                ingestLocalSelection(e.dataTransfer?.files ?? []);
              }}
              className={`rounded-2xl border border-dashed p-5 text-center transition ${
                isDragging ? "animate-pulse border-[#22D3EE]/70 bg-[#22D3EE]/10" : "border-[#3B82F6]/30 bg-[#111827]/95"
              }`}
            >
              <UploadCloud className="mx-auto h-7 w-7 text-[#93C5FD]" aria-hidden />
              <p className="mt-2 text-sm font-medium text-[#E5E7EB]">Drop lab specimen onto gateway</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Filename sanitized; extension allow-list enforced POP-side (.csv,.zip,.exe,...)</p>

              <div className="mt-3 flex flex-col items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/15 px-3 py-2 text-xs text-[#BFDBFE] transition hover:bg-[#3B82F6]/25">
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      ingestLocalSelection(e.target.files);
                      const el = /** @type {HTMLInputElement} */ (e.target);
                      if (el) el.value = "";
                    }}
                  />
                  Choose file (metadata only · lab)
                </label>
                <button
                  type="button"
                  disabled={busyId === "sim"}
                  onClick={() =>
                    ingestLocalSelection([{ name: `lab_push_${Math.floor(Math.random() * 900 + 100)}.csv` }])
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#E5E7EB] hover:bg-white/10 disabled:opacity-50"
                >
                  {busyId === "sim" ? "Queuing..." : "Simulate sanitized CSV ingest"}
                </button>

                <div className="w-full rounded-lg border border-white/10 bg-[#0F172A]/80 p-2 text-left text-[11px] text-[#94A3B8]">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Preset assign targets</div>
                  <select
                    value={assignDraft}
                    onChange={(ev) => setAssignDraft(ev.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-[#0B1220] px-2 py-1 text-[#E2E8F0]"
                  >
                    {ANALYST_PRESETS.map((mail) => (
                      <option key={mail} value={mail}>
                        {mail}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-[10px]">Used when choosing “Assign analyst queue” inside row actions.</div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {selectedJob ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="rounded-2xl border border-[#3B82F6]/30 bg-[#0B1220]/95 p-4 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Selected job</div>
                      <div className="break-all text-sm font-semibold text-[#E5E7EB]">{selectedJob.fileName}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={decisionTone(selectedJob.finalDecision)}>{selectedJob.finalDecision}</StatusBadge>
                        <StatusBadge tone={selectedJob.encryption === "Encrypted" ? "success" : "warning"}>
                          Crypto · {selectedJob.encryption}
                        </StatusBadge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-[#94A3B8]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-3">
                    <AttackChainStrip job={selectedJob} />

                    {(selectedJob.finalDecision === "block" || selectedJob.blocked) && selectedJob.explainability ? (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#FECACA]">Disposition explainability</div>
                        {selectedJob.explainability.triggeredRules?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {selectedJob.explainability.triggeredRules.map((rule) => (
                              <span key={rule} className="rounded border border-white/15 bg-black/35 px-2 py-0.5 font-mono text-[10px] text-[#FDE68A]">
                                {sanitizePlainText(rule, 96)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {selectedJob.explainability.blockReason ? (
                          <p className="mt-3 text-[12px] leading-relaxed text-[#FECDD3]" title={selectedJob.explainability.summary}>
                            {sanitizePlainText(selectedJob.explainability.blockReason, 520)}
                          </p>
                        ) : (
                          <p className="mt-2 text-[12px] text-[#FECDD3]">Automatic policy + telemetry fused block — inspect triggered rules.</p>
                        )}
                        <p className="mt-2 text-[11px] text-[#94A3B8]">{sanitizePlainText(selectedJob.explainability.summary ?? "", 420)}</p>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <SectionHeader title="Stage-by-stage posture" subtitle="Hover rows for encryption, malware, policy, and disposition explainers." />
                    </div>
                    <div className="max-h-[min(70vh,480px)] overflow-auto pr-1">
                      <PipelineDetail job={selectedJob} schema={schema} />
                    </div>

                    {selectedJob.lifecycle?.length ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-[#111827]/60 p-3">
                        <div className="text-[11px] font-semibold text-[#E2E8F0]">File lifecycle (immutable trace)</div>
                        <ol className="mt-3 space-y-3 border-l border-white/10 pl-4">
                          {[...(selectedJob.lifecycle ?? [])]
                            .slice()
                            .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
                            .map((evt) => (
                              <li key={`${evt.phase}-${evt.at}`} className="relative text-[11px] text-[#94A3B8]">
                                <span className="absolute -left-[21px] top-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#38BDF8]" aria-hidden />
                                <div className="font-semibold text-[#E5E7EB]">{sanitizePlainText(evt.label, 160)}</div>
                                <div className="text-[10px] text-[#64748B]">{formatClock(evt.at)} · {sanitizePlainText(evt.phase, 64)}</div>
                                <div className="leading-relaxed">{sanitizePlainText(evt.detail, 480)}</div>
                              </li>
                            ))}
                        </ol>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <div className="text-xs font-semibold text-[#E2E8F0]">Job-scoped SOC audit</div>
                      <div className="mt-2 max-h-32 space-y-1 overflow-auto text-[11px] text-[#94A3B8]">
                        {relatedAudit.length === 0 ? <span className="italic">Operator actions will appear chronologically.</span> : null}
                        {relatedAudit.map((evt) => (
                          <div key={evt.id} className="rounded border border-white/5 bg-[#0F172A]/80 px-2 py-1">
                            <span className="mr-2 text-[#475569]">{formatClock(evt.at)}</span>
                            <span className="mr-2 text-[#A5B4FC]">{evt.actor}</span>
                            <span>{evt.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(59,130,246,0.25)]"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageContainer>
  );
}
