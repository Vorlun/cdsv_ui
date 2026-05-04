import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Loader2, RotateCcw, Save, Send } from "lucide-react";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useGovernanceConsole } from "@/hooks/useGovernanceConsole";
import { socApi } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { SECURITY_GOVERNANCE_DEFAULTS } from "@/services/data/securityGovernanceDefaults";
import { sanitizePlainText } from "@/utils/sanitize";
import { buildSocUiGates, normalizeSocRole, socMay } from "@/utils/socPermissions";

const tabs = [
  "General",
  "Security",
  "Notifications",
  "Access Roles",
  "Integrations",
  "Backup & Recovery",
  "Branding",
  "Audit",
];

const SEVERITY_OPTS = ["Critical", "High", "Medium", "Low"];

function cloneGovernanceDraft() {
  return {
    security: { ...SECURITY_GOVERNANCE_DEFAULTS.security },
    notifications: { ...SECURITY_GOVERNANCE_DEFAULTS.notifications },
    integrations: { ...SECURITY_GOVERNANCE_DEFAULTS.integrations },
    rbacMatrix: JSON.parse(JSON.stringify(SECURITY_GOVERNANCE_DEFAULTS.rbacMatrix)),
  };
}

function draftFromApi(governance) {
  if (!governance) return null;
  return {
    security: { ...(governance.security ?? {}) },
    notifications: { ...(governance.notifications ?? {}) },
    integrations: { ...(governance.integrations ?? {}) },
    rbacMatrix: JSON.parse(JSON.stringify(governance.rbacMatrix ?? SECURITY_GOVERNANCE_DEFAULTS.rbacMatrix)),
  };
}

function ToggleRow({ label, checked, onChange, description, disabled }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#E5E7EB]">{label}</div>
          {description ? <div className="text-xs text-[#94A3B8]">{description}</div> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={checked}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative h-6 w-11 rounded-full transition ${
            checked ? "bg-[#3B82F6]" : "bg-[#334155]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const actor = sanitizePlainText(user?.email ?? user?.fullName ?? "soc.admin@lab", 254);
  const socRole = normalizeSocRole(user?.socRole);
  const { governance, audit, outbox, loading, error, refresh } = useGovernanceConsole({ streamIntervalMs: 5200 });
  const uiGates = useMemo(() => buildSocUiGates(socRole, governance), [socRole, governance]);

  const [activeTab, setActiveTab] = useState("Security");
  const [toast, setToast] = useState("");
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);
  const importRef = useRef(null);

  const canWrite = socMay(socRole, "canGovernanceWrite");
  const canExportPlane = socMay(socRole, "canGovernanceExport");
  const canImportPlane = socMay(socRole, "canGovernanceImport");
  const canWebhook = socMay(socRole, "canWebhookTest");
  const controlsLocked = !canWrite || saveBusy;

  const showToast = (message) => {
    setToast(sanitizePlainText(message, 380));
    window.setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    if (!governance || dirty) return;
    setDraft(draftFromApi(governance));
  }, [governance, dirty]);

  const updateZone = useCallback((zone, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [zone]: { ...prev[zone], ...patch } };
    });
    setDirty(true);
  }, []);

  const flipRbac = useCallback((facet, roleKey) => {
    if (controlsLocked) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const nextMatrix = { ...prev.rbacMatrix, [facet]: { ...prev.rbacMatrix[facet] } };
      nextMatrix[facet] = { ...nextMatrix[facet], [roleKey]: !nextMatrix[facet][roleKey] };
      return { ...prev, rbacMatrix: nextMatrix };
    });
    setDirty(true);
  }, [controlsLocked]);

  const handleSave = async () => {
    if (!draft || !canWrite) return;
    setSaveBusy(true);
    try {
      await socApi.governanceSave({
        actor,
        socRole,
        patch: {
          security: draft.security,
          notifications: draft.notifications,
          integrations: draft.integrations,
          rbacMatrix: draft.rbacMatrix,
        },
      });
      setDirty(false);
      await refresh();
      showToast("Security Control Center synchronized to governance plane.");
    } catch (err) {
      showToast(normalizeSocError(err).message ?? "Governance save rejected.");
    } finally {
      setSaveBusy(false);
    }
  };

  const handleResetLocal = () => {
    setDraft(cloneGovernanceDraft());
    setDirty(true);
    showToast("Draft reset to factory defaults — Save to push to control plane.");
  };

  const handleExportDownload = async () => {
    if (!canExportPlane) {
      showToast("Export entitlement missing for this SOC persona.");
      return;
    }
    try {
      const bundle = await socApi.governanceExport();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soc-governance-export-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Governance interchange JSON downloaded.");
    } catch (err) {
      showToast(normalizeSocError(err).message ?? "Export gateway fault.");
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canImportPlane) {
      if (!canImportPlane) showToast("Import / restore requires Security Control Center administrator.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const gov = parsed.governance ?? parsed.patch ?? parsed;
        await socApi.governanceImport({ actor, socRole, governance: gov });
        setDirty(false);
        await refresh();
        showToast("Governance snapshot restored — upload lab and telemetry bias re-hydrated.");
      } catch (err) {
        showToast(normalizeSocError(err).message ?? "Import JSON invalid or rejected.");
      }
    };
    reader.readAsText(file);
  };

  const handleWebhookProbe = async () => {
    if (!canWebhook) {
      showToast("Webhook simulation unavailable for viewer personas.");
      return;
    }
    setWebhookBusy(true);
    try {
      await socApi.webhookThreatIngest({
        severity: "High",
        summary: "Synthetic northbound IOC envelope — manual SCC probe",
        correlationId: `SCC-PROBE-${Date.now()}`,
      });
      await refresh();
      showToast("POST /webhook/threat accepted — Threat Monitor + notification bridge updated.");
    } catch (err) {
      showToast(normalizeSocError(err).message ?? "Webhook ingest simulator fault.");
    } finally {
      setWebhookBusy(false);
    }
  };

  const renderPlaceholder = (title, description) => (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
      <div className="text-sm font-medium text-[#E5E7EB]">{title}</div>
      <div className="mt-1 text-xs text-[#94A3B8]">{description}</div>
    </div>
  );

  const renderSecurity = () =>
    draft ? (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[#E5E7EB]">Threat sensitivity — drives risk scoring & synthetic alert cadence</span>
            <span className="text-sm text-[#93C5FD]">{draft.security.threatSensitivity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            disabled={controlsLocked}
            value={draft.security.threatSensitivity}
            onChange={(event) => updateZone("security", { threatSensitivity: Number(event.target.value) })}
            className="w-full accent-[#3B82F6] disabled:opacity-40"
          />
          <p className="mt-2 text-[11px] text-[#64748B]">
            Propagates into Threat Monitor rollups, SOC stream log augmentation, and ingestion malware fusion (simulated southbound).
          </p>
        </div>

        <ToggleRow
          label="Auto block suspicious IPv4"
          checked={draft.security.autoBlockSuspiciousIp}
          disabled={controlsLocked}
          onChange={(v) => updateZone("security", { autoBlockSuspiciousIp: v })}
          description="Carrier-style automated sinkhole staging when synthetic risk exceeds thresholds."
        />
        <ToggleRow label="Force 2FA for administrators" checked={draft.security.force2fa} disabled={controlsLocked} onChange={(v) => updateZone("security", { force2fa: v })} />
        <ToggleRow label="Require file encryption" checked={draft.security.requireEncryption} disabled={controlsLocked} onChange={(v) => updateZone("security", { requireEncryption: v })} />
        <ToggleRow label="Trusted devices only" checked={draft.security.trustedDevicesOnly} disabled={controlsLocked} onChange={(v) => updateZone("security", { trustedDevicesOnly: v })} />

        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Session timeout (minutes)</div>
          <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-[#111827]">
            {[15, 30, 45, 60].map((item) => (
              <button
                key={item}
                type="button"
                disabled={controlsLocked}
                onClick={() => updateZone("security", { sessionTimeoutMinutes: item })}
                className={`px-3 py-2 text-xs transition ${
                  draft.security.sessionTimeoutMinutes === item ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "text-[#9CA3AF] hover:bg-white/5"
                } disabled:opacity-40`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Password policy tier</div>
          <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-[#111827]">
            {["Standard", "Strict", "Maximum"].map((item) => (
              <button
                key={item}
                type="button"
                disabled={controlsLocked}
                onClick={() => updateZone("security", { passwordPolicy: item })}
                className={`px-3 py-2 text-xs transition ${
                  draft.security.passwordPolicy === item ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "text-[#9CA3AF] hover:bg-white/5"
                } disabled:opacity-40`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="flex justify-center py-16 text-[#64748B]">
        <Loader2 className="h-8 w-8 animate-spin text-[#38BDF8]" aria-hidden />
      </div>
    );

  const renderNotifications = () =>
    draft ? (
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleRow label="Email bridge" checked={draft.notifications.emailAlerts} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { emailAlerts: v })} />
        <ToggleRow label="Push / mobile bridge" checked={draft.notifications.pushAlerts} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { pushAlerts: v })} />
        <ToggleRow label="Weekly executive summary" checked={draft.notifications.weeklySummary} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { weeklySummary: v })} />
        <ToggleRow label="Critical incidents only" checked={draft.notifications.criticalOnly} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { criticalOnly: v })} />
        <ToggleRow label="Simulate Slack digest" checked={draft.notifications.simulateSlack} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { simulateSlack: v })} />
        <ToggleRow label="Simulate Telegram bridge" checked={draft.notifications.simulateTelegram} disabled={controlsLocked} onChange={(v) => updateZone("notifications", { simulateTelegram: v })} />
        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4 md:col-span-2">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Minimum dispatch severity</div>
          <p className="mb-2 text-[11px] text-[#64748B]">Notification engine suppresses lower-severity synthetic alerts unless raised here.</p>
          <select
            disabled={controlsLocked}
            value={draft.notifications.minimumDispatchSeverity ?? "Medium"}
            onChange={(e) => updateZone("notifications", { minimumDispatchSeverity: e.target.value })}
            className="w-full max-w-xs rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-[#E5E7EB] disabled:opacity-40"
          >
            {SEVERITY_OPTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : null;

  const renderIntegrations = () =>
    draft ? (
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleRow
          label="Webhook threat path (simulated)"
          checked={draft.integrations.webhookThreatPathEnabled !== false}
          disabled={controlsLocked}
          onChange={(v) => updateZone("integrations", { webhookThreatPathEnabled: v })}
          description="Mirrors carrier northbound SOAR ingest — fans out to notification outbox when threats arrive."
        />
        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Slack channel label (sim)</div>
          <input
            disabled={controlsLocked}
            value={draft.integrations.slackChannelSim ?? ""}
            onChange={(e) => updateZone("integrations", { slackChannelSim: sanitizePlainText(e.target.value, 120) })}
            className="w-full rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-[#E5E7EB] disabled:opacity-40"
          />
        </div>
        <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Telegram topic label (sim)</div>
          <input
            disabled={controlsLocked}
            value={draft.integrations.telegramTopicSim ?? ""}
            onChange={(e) => updateZone("integrations", { telegramTopicSim: sanitizePlainText(e.target.value, 120) })}
            className="w-full rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm text-[#E5E7EB] disabled:opacity-40"
          />
        </div>
          <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4 md:col-span-2">
          <div className="mb-1 text-xs text-[#64748B]">Last webhook receipt</div>
          <div className="font-mono text-sm text-[#93C5FD]">
            {sanitizePlainText(governance?.integrations?.lastOutboundWebhookReceipt || draft.integrations.lastOutboundWebhookReceipt || "—", 120)}
          </div>
          <button
            type="button"
            disabled={!canWebhook || webhookBusy}
            onClick={() => void handleWebhookProbe()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#38BDF8]/35 bg-[#38BDF8]/15 px-3 py-2 text-sm text-[#BAE6FD] transition hover:bg-[#38BDF8]/25 disabled:opacity-40"
          >
            {webhookBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            POST /webhook/threat smoke test
          </button>
        </div>
      </div>
    ) : null;

  const rbacFacets = useMemo(() => Object.keys(draft?.rbacMatrix ?? {}), [draft?.rbacMatrix]);

  const renderAccessRoles = () =>
    draft ? (
      <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
        <div className="mb-3 text-sm font-medium text-[#E5E7EB]">Live Access Roles matrix · enforced at mock gateway + UI hints</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#94A3B8]">
                <th className="px-2 py-2">Permission facet</th>
                <th className="px-2 py-2">Admin</th>
                <th className="px-2 py-2">Analyst</th>
                <th className="px-2 py-2">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {rbacFacets.map((facet) => (
                <tr key={facet} className="border-t border-white/10 text-[#D1D5DB]">
                  <td className="px-2 py-2 font-mono text-xs text-[#94A3B8]">{facet}</td>
                  {["Admin", "Analyst", "Viewer"].map((rk) => (
                    <td key={rk} className="px-2 py-2">
                      <button
                        type="button"
                        disabled={controlsLocked}
                        onClick={() => flipRbac(facet, rk)}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          draft.rbacMatrix?.[facet]?.[rk]
                            ? "bg-[#10B981]/20 text-[#86EFAC]"
                            : "bg-white/10 text-[#9CA3AF]"
                        } disabled:opacity-40`}
                      >
                        {draft.rbacMatrix?.[facet]?.[rk] ? "Allowed" : "Denied"}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-[#64748B]">
          Persona capabilities (SOC role) stack with this matrix — e.g. Analyst cannot hard-block even if a facet were toggled on without matching server capability.
        </p>
      </div>
    ) : null;

  const renderBackup = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4 md:col-span-2">
        <div className="text-sm font-medium text-[#E5E7EB]">Governance interchange</div>
        <p className="mt-1 text-xs text-[#94A3B8]">
          Deterministic JSON export includes the full security, notification, integration, and RBAC snapshot used by the simulated control plane.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canExportPlane}
            onClick={() => void handleExportDownload()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-sm text-[#A7F3D0] transition hover:bg-[#10B981]/20 disabled:opacity-40"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export JSON
          </button>
          <button
            type="button"
            disabled={!canImportPlane}
            onClick={() => importRef.current?.click()}
            className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FDE68A] transition hover:bg-[#F59E0B]/20 disabled:opacity-40"
          >
            Import / restore…
          </button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
        <div className="mb-2 text-sm font-semibold text-[#E5E7EB]">Governance audit trail</div>
        <p className="mb-3 text-[11px] text-[#64748B]">Who changed policy, when, and structured old → new field diff (simulated tamper-evident ledger).</p>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {audit.length === 0 ? (
            <p className="text-xs text-[#64748B]">No governance mutations recorded yet.</p>
          ) : (
            audit.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/5 bg-[#111827]/80 p-2.5 font-mono text-[11px] text-[#CBD5E1]">
                <div className="flex flex-wrap gap-x-2 text-[#93C5FD]">
                  <span>{sanitizePlainText(entry.actor, 200)}</span>
                  <span className="text-[#64748B]">{sanitizePlainText(entry.at, 40)}</span>
                  <span className="text-[#FDE68A]">{sanitizePlainText(entry.actorSocRole ?? "", 16)}</span>
                </div>
                <div className="mt-1 text-[#E5E7EB]">{sanitizePlainText(entry.summary ?? entry.action, 240)}</div>
                {Array.isArray(entry.changes) && entry.changes.length ? (
                  <ul className="mt-2 space-y-1 text-[10px] text-[#94A3B8]">
                    {entry.changes.slice(0, 8).map((ch, idx) => (
                      <li key={`${entry.id}-ch-${idx}`}>
                        <span className="text-[#A5B4FC]">{sanitizePlainText(ch.path, 120)}</span> ·{" "}
                        <span className="text-[#FCA5A5]">{JSON.stringify(ch.oldValue)}</span> →{" "}
                        <span className="text-[#6EE7B7]">{JSON.stringify(ch.newValue)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
        <div className="mb-2 text-sm font-semibold text-[#E5E7EB]">Notification outbox (Slack / Telegram / webhook sim)</div>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {outbox.length === 0 ? (
            <p className="text-xs text-[#64748B]">No outbound simulation rows — raise sensitivity or fire webhook probe.</p>
          ) : (
            outbox.map((row) => (
              <div key={row.id} className="rounded border border-white/5 bg-[#111827]/70 px-2 py-1.5 text-[11px] text-[#D1D5DB]">
                <span className="text-[#FDE68A]">{sanitizePlainText(row.channel, 24)}</span> ·{" "}
                <span className="text-[#94A3B8]">{sanitizePlainText(row.at, 40)}</span>
                <div className="mt-0.5 text-[#E5E7EB]">{sanitizePlainText(row.text, 480)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "Security") return renderSecurity();
    if (activeTab === "Notifications") return renderNotifications();
    if (activeTab === "Backup & Recovery") return renderBackup();
    if (activeTab === "Access Roles") return renderAccessRoles();
    if (activeTab === "Integrations") return renderIntegrations();
    if (activeTab === "Audit") return renderAudit();
    if (activeTab === "General") return renderPlaceholder("General preferences", "Region, language, tenant metadata — wire to carrier OSS in production builds.");
    if (activeTab === "Branding") return renderPlaceholder("Branding", "Logos, palette, and white-label assets.");
    return renderPlaceholder("Audit settings", "Retention classes and legal hold — extends the governance audit module.");
  };

  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-10 h-[320px] w-[320px] rounded-full bg-[#3B82F6]/12 blur-3xl"
        animate={{ x: [0, 14, 0], y: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-20 h-[320px] w-[320px] rounded-full bg-[#22D3EE]/10 blur-3xl"
        animate={{ x: [0, -12, 0], y: [0, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-white/10 bg-[#0F172A]/90 p-5 shadow-[0_0_20px_rgba(59,130,246,0.14)]">
          <h1 className="text-[42px] font-semibold tracking-tight text-white">Security Control Center</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            State-driven SOC governance — threat sensitivity, notification policy, RBAC matrix, and backup interchange for the simulated SIEM / SOAR control plane.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
            <span className="rounded-full border border-white/10 bg-[#111827] px-2 py-0.5 font-mono text-[#93C5FD]">
              Session: {sanitizePlainText(actor, 200)} · {socRole}
            </span>
            {uiGates.canUiBlockIp ? (
              <span className="text-[#6EE7B7]">Sinkhole UI: allowed</span>
            ) : (
              <span className="text-[#F97316]">Sinkhole UI: denied</span>
            )}
            {dirty ? <span className="text-[#FDE68A]">Unsaved draft</span> : <span className="text-[#94A3B8]">Draft aligned with stream</span>}
          </div>
        </section>

        {error ? <ErrorBanner title="Governance plane unavailable" message={error} onRetry={() => void refresh()} /> : null}

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
            <aside className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeTab === tab ? "bg-[#3B82F6]/20 text-[#BFDBFE]" : "text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </aside>

            <div className="relative min-h-[420px] rounded-[18px] border border-white/10 bg-[#0F172A]/70 p-4 pb-24">
              {loading && !draft ? (
                <div className="flex justify-center py-24 text-[#64748B]">
                  <Loader2 className="h-10 w-10 animate-spin text-[#38BDF8]" aria-hidden />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">{activeTab}</div>
                    {renderTabContent()}
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 rounded-[18px] border border-white/10 bg-[#0B1220]/95 p-3 backdrop-blur">
                <button
                  type="button"
                  disabled={!canWrite || saveBusy || !dirty}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/20 px-3 py-2 text-sm text-[#BFDBFE] shadow-[0_0_12px_rgba(59,130,246,0.25)] transition hover:brightness-110 disabled:opacity-40"
                >
                  {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                  Save to control plane
                </button>
                <button
                  type="button"
                  disabled={!canWrite || controlsLocked}
                  onClick={handleResetLocal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FDE68A] transition hover:brightness-110 disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Reset draft to defaults
                </button>
                <button
                  type="button"
                  disabled={!canExportPlane}
                  onClick={() => void handleExportDownload()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-sm text-[#A7F3D0] transition hover:brightness-110 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Quick export
                </button>
                {!canWrite ? (
                  <span className="self-center text-[11px] text-[#F97316]">Viewer / Analyst personas cannot mutate governance — use an administrator account.</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-4 right-4 z-[80] max-w-md rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_14px_rgba(59,130,246,0.25)]"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
