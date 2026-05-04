import { useMemo, useState } from "react";
import { Bell, KeyRound, Loader2, Lock, Shield, TriangleAlert } from "lucide-react";
import { env } from "@/config/env";
import { ApiError } from "@/services/api/apiError";
import { postSocSettings } from "@/services/api";
import SocUserPageShell from "@/components/soc/SocUserPageShell";

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          aria-pressed={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-7 w-12 rounded-full transition ${
            checked ? "bg-emerald-600" : "bg-white/20"
          }`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? "left-[26px]" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

export default function UserSettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [securityMode, setSecurityMode] = useState("strict");
  const [storageMode, setStorageMode] = useState("vault_hardened");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(true);
  const [uploadAlerts, setUploadAlerts] = useState(true);
  const [savedAt, setSavedAt] = useState(Date.now());
  const [savePhase, setSavePhase] = useState(/** @type {"idle"|"loading"|"success"|"error"} */ ("idle"));
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null));

  const role = "Analyst";
  const permissions = useMemo(() => "Read dashboards • Upload evidence • Revoke own sessions", []);

  const saveAll = async () => {
    setSavePhase("loading");
    setSaveError(null);
    const payload = {
      mfaEnabled,
      securityMode,
      storageMode,
      notifications: {
        email: emailAlerts,
        suspiciousActivity: suspiciousAlerts,
        uploadAnomalies: uploadAlerts,
      },
      clientMeta: {
        sdk: "vite-react",
      },
    };
    try {
      if (!env.useMockApi) await postSocSettings(payload);
      setSavedAt(Date.now());
      setSavePhase("success");
      window.setTimeout(() => setSavePhase((p) => (p === "success" ? "idle" : p)), 2400);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Settings could not be persisted.";
      setSaveError(msg);
      setSavePhase("error");
    }
  };

  const ageSec = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));

  return (
    <SocUserPageShell
      title="Security Control Center"
      subtitle="Identity, authentication, vault storage mode, and alert channels. Demo mode persists locally only; POST /settings when API is live."
      badge={
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            env.useMockApi ? "border-amber-500/35 bg-amber-500/10 text-amber-100" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {env.useMockApi ? "Local prefs" : "API sync"}
        </span>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#111827] px-6 py-4 text-sm text-slate-400">
          <p>Last synced {ageSec < 120 ? `${ageSec} s ago` : `${Math.floor(ageSec / 60)} min ago`}</p>
          {savePhase === "success" ? (
            <p className="mt-2 text-emerald-300">Preferences saved successfully.</p>
          ) : null}
          {savePhase === "error" && saveError ? (
            <div role="alert" className="mt-3 rounded-lg border border-rose-500/35 bg-rose-950/25 px-3 py-2 text-rose-100">
              <p>{saveError}</p>
              <button
                type="button"
                onClick={() => void saveAll()}
                className="mt-2 text-xs font-semibold text-white underline underline-offset-2 hover:text-rose-50"
              >
                Retry sync
              </button>
            </div>
          ) : null}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <Lock className="h-4 w-4" /> Authentication
          </h3>
          <div className="space-y-3">
            <ToggleRow
              label="Multi-factor authentication"
              description="Require additional verification for privileged actions."
              checked={mfaEnabled}
              onChange={setMfaEnabled}
            />
            <button className="rounded-xl border border-sky-500/35 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-500/25 active:scale-[0.98]">
              Change password
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <KeyRound className="h-4 w-4" /> Access control
            </h3>
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0F172A] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Role</p>
              <p className="text-sm font-medium text-white">{role}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Permissions summary</p>
              <p className="text-sm text-slate-300">{permissions}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <Shield className="h-4 w-4" /> Security mode
            </h3>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs text-slate-500">Policy level</span>
              <select
                value={securityMode}
                onChange={(event) => setSecurityMode(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-500/40"
              >
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
                <option value="paranoid">Paranoid</option>
              </select>
            </label>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs text-slate-500">Storage mode</span>
              <select
                value={storageMode}
                onChange={(event) => setStorageMode(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-500/40"
              >
                <option value="vault_hardened">Vault hardened (SOC default)</option>
                <option value="dual_region_encrypted">Dual-region encrypted replicas</option>
                <option value="retention_balanced">Balanced retention + erasure-coded</option>
              </select>
            </label>

            <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p>
                <span className="text-emerald-300/80">Encryption:</span> AES-256-GCM
              </p>
              <p>
                <span className="text-emerald-300/80">Key rotation:</span> Enabled
              </p>
              <p>
                <span className="text-emerald-300/80">Integrity check:</span> Active
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <Bell className="h-4 w-4" /> Alert settings
          </h3>
          <div className="space-y-3">
            <ToggleRow
              label="Email alerts"
              description="Send policy and incident events to inbox."
              checked={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              label="Suspicious activity alerts"
              description="Notify on anomalous sign-ins and privilege events."
              checked={suspiciousAlerts}
              onChange={setSuspiciousAlerts}
            />
            <ToggleRow
              label="Upload anomaly alerts"
              description="Notify on outlier upload behavior and file risk patterns."
              checked={uploadAlerts}
              onChange={setUploadAlerts}
            />
          </div>
        </section>

        {!mfaEnabled ? (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <TriangleAlert className="mr-2 inline h-4 w-4" />
            MFA is disabled — account security posture is reduced.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={savePhase === "loading"}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]"
          >
            {savePhase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save security settings
          </button>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            SECURE
          </span>
        </div>
      </div>
    </SocUserPageShell>
  );
}
