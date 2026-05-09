import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { ApiError } from "@/services/api/apiError";
import { postSocSettings } from "@/services/api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import SocUserPageShell from "@/components/soc/SocUserPageShell";

const LANGS = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "Asia/Tokyo",
  "Asia/Singapore",
];

/* ─── sub-components ────────────────────────────────────────────── */

function SectionTitle({ icon: Icon, children, isLight }) {
  return (
    <h3 className={`mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </h3>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled = false, isLight }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3.5 transition ${
      isLight
        ? "border-slate-200 bg-white hover:border-blue-200"
        : "border-white/[0.07] bg-[#0F172A]/70 hover:border-sky-500/20"
    }`}>
      <div>
        <p className={`text-[15px] font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{label}</p>
        <p className={`mt-0.5 text-[13px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : isLight ? "bg-slate-200" : "bg-white/20"} disabled:opacity-40`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[26px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SelectField({ label, value, onChange, options, isLight }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-[13px] font-semibold ${isLight ? "text-slate-500" : "text-slate-500"}`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-2.5 text-[15px] outline-none transition ${
          isLight
            ? "border-slate-200 bg-white text-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            : "border-white/10 bg-[#0F172A] text-white focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20"
        }`}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </label>
  );
}

function InfoRow({ label, value, isLight }) {
  return (
    <div className={`flex items-center justify-between border-t py-2.5 first:border-t-0 ${isLight ? "border-slate-100" : "border-white/[0.06]"}`}>
      <span className={`text-[13px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>{label}</span>
      <span className={`text-[13px] font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{value}</span>
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────────────── */

export default function UserSettingsPage() {
  const { user, role } = useAuth();
  const wc = useWorkspaceControl();
  const { isLight } = wc;

  const resetTimerRef = useRef(null);
  const [savePhase, setSavePhase] = useState("idle");
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(Date.now());

  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [securityMode, setSecurityMode] = useState("strict");
  const [storageMode, setStorageMode] = useState("vault_hardened");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(true);
  const [uploadAlerts, setUploadAlerts] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [telemetryAlerts, setTelemetryAlerts] = useState(false);
  const [socRelayAlerts, setSocRelayAlerts] = useState(true);

  const ageSec = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  const syncLabel = ageSec < 120 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

  const permissions = useMemo(() => {
    if (role === "admin") return "Full administrative access · all modules";
    return "Read dashboards · Upload evidence · Revoke own sessions";
  }, [role]);

  const saveAll = useCallback(async () => {
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
        anomalyDetection: anomalyAlerts,
        telemetryEvents: telemetryAlerts,
        socRelayStatus: socRelayAlerts,
      },
      preferences: {
        language: wc.preferences.language,
        timezone: wc.preferences.timezone,
        theme: wc.theme,
      },
    };
    try {
      await postSocSettings(payload);
      setSavedAt(Date.now());
      setSavePhase("success");
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(
        () => setSavePhase((p) => (p === "success" ? "idle" : p)),
        2_400,
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Settings could not be persisted.";
      setSaveError(msg);
      setSavePhase("error");
    }
  }, [mfaEnabled, securityMode, storageMode, emailAlerts, suspiciousAlerts, uploadAlerts, anomalyAlerts, telemetryAlerts, socRelayAlerts, wc.preferences, wc.theme]);

  useEffect(() => () => { if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current); }, []);

  /* shared card class */
  const card = isLight
    ? "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] p-6"
    : "rounded-2xl border border-white/[0.08] bg-[#111827] p-6";

  const inset = isLight
    ? "rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
    : "rounded-xl border border-white/[0.07] bg-[#0F172A] px-4 py-4";

  return (
    <SocUserPageShell
      title="Security Control Center"
      subtitle="Authentication policy, vault configuration, notifications, and workspace preferences."
      badge={
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            savePhase === "success"
              ? isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          }`}>
            {savePhase === "success" ? "Saved" : "API sync"}
          </span>
          <span className={`text-[12px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>Last saved {syncLabel}</span>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── save error ────────────────────────────────────────── */}
        {savePhase === "error" && saveError ? (
          <div role="alert" className={`rounded-xl border px-4 py-3.5 ${isLight ? "border-rose-200 bg-rose-50" : "border-rose-500/35 bg-rose-950/25"}`}>
            <p className={`text-[15px] font-semibold ${isLight ? "text-rose-700" : "text-white"}`}>Settings could not be saved</p>
            <p className={`mt-1 text-[13px] ${isLight ? "text-rose-600" : "text-rose-200"}`}>{saveError}</p>
            <button type="button" onClick={() => void saveAll()} className={`mt-2.5 text-[13px] font-semibold underline underline-offset-2 ${isLight ? "text-rose-600 hover:text-rose-700" : "text-rose-300 hover:text-rose-200"}`}>
              Retry
            </button>
          </div>
        ) : null}

        {/* ── appearance + localization ─────────────────────────── */}
        <section className={card}>
          <SectionTitle icon={Globe2} isLight={isLight}>Appearance &amp; Localization</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* theme */}
            <div>
              <p className={`mb-2 text-[13px] font-semibold ${isLight ? "text-slate-500" : "text-slate-500"}`}>Color scheme</p>
              <div className="flex gap-2">
                {[{ id: "dark", label: "Dark", Icon: Moon }, { id: "light", label: "Light", Icon: Sun }].map(({ id, label, Icon }) => {
                  const selected = wc.theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => wc.setTheme(id)}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[15px] font-semibold transition hover:-translate-y-px active:scale-[0.98] ${
                        selected
                          ? isLight
                            ? "border-blue-300 bg-blue-50 text-blue-700 shadow-[0_0_20px_-8px_rgba(37,99,235,0.3)]"
                            : "border-[#3B82F6]/50 bg-[#1E3A8A]/35 text-sky-200 shadow-[0_0_20px_-8px_rgba(59,130,246,0.5)]"
                          : isLight
                            ? "border-slate-200 bg-white text-slate-500 hover:text-slate-900"
                            : "border-white/10 bg-[#0F172A] text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* language + timezone */}
            <div className="space-y-3">
              <SelectField label="Language" value={wc.preferences.language} onChange={(v) => wc.updatePreferences({ language: v })} options={LANGS} isLight={isLight} />
              <SelectField label="Timezone" value={wc.preferences.timezone} onChange={(v) => wc.updatePreferences({ timezone: v })} options={ZONES.map((z) => ({ value: z, label: z }))} isLight={isLight} />
            </div>
          </div>
        </section>

        {/* ── authentication ────────────────────────────────────── */}
        <section className={card}>
          <SectionTitle icon={Lock} isLight={isLight}>Authentication</SectionTitle>
          <div className="space-y-3">
            <ToggleRow
              label="Multi-Factor Authentication (TOTP)"
              description="Require a time-based one-time code for privileged console actions."
              checked={mfaEnabled}
              onChange={setMfaEnabled}
              isLight={isLight}
            />
            {!mfaEnabled ? (
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] ${isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                <TriangleAlert className="h-4 w-4 shrink-0" />
                MFA disabled — account security posture is reduced by 15 points.
              </div>
            ) : null}
            <button
              type="button"
              className={`rounded-xl border px-4 py-2.5 text-[15px] font-semibold transition hover:-translate-y-px active:scale-[0.98] ${
                isLight
                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-sky-500/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
              }`}
            >
              Change password
            </button>
          </div>
        </section>

        {/* ── access control + security mode ───────────────────── */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <SectionTitle icon={KeyRound} isLight={isLight}>Access Control</SectionTitle>
            <div className={inset}>
              <InfoRow label="Role" value={`${role ?? "—"}`} isLight={isLight} />
              <InfoRow label="Permissions" value={permissions} isLight={isLight} />
              <InfoRow label="Account" value={user?.email ?? "—"} isLight={isLight} />
            </div>
          </div>

          <div className={card}>
            <SectionTitle icon={Shield} isLight={isLight}>Security Policy</SectionTitle>
            <div className="space-y-3">
              <SelectField
                label="Policy level"
                value={securityMode}
                onChange={setSecurityMode}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "strict", label: "Strict (recommended)" },
                  { value: "paranoid", label: "Paranoid" },
                ]}
                isLight={isLight}
              />
              <SelectField
                label="Vault storage mode"
                value={storageMode}
                onChange={setStorageMode}
                options={[
                  { value: "vault_hardened", label: "Vault hardened (SOC default)" },
                  { value: "dual_region_encrypted", label: "Dual-region encrypted replicas" },
                  { value: "retention_balanced", label: "Balanced retention + erasure-coded" },
                ]}
                isLight={isLight}
              />
              <div className={`rounded-xl border px-4 py-3 ${isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/[0.07]"}`}>
                <InfoRow label="Encryption" value="AES-256-GCM" isLight={isLight} />
                <InfoRow label="Key rotation" value="Enabled" isLight={isLight} />
                <InfoRow label="Integrity check" value="Active" isLight={isLight} />
              </div>
            </div>
          </div>
        </section>

        {/* ── notification channels ─────────────────────────────── */}
        <section className={card}>
          <SectionTitle icon={Bell} isLight={isLight}>Notification Channels</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleRow label="Email Alerts" description="Policy events and security incidents delivered to inbox." checked={emailAlerts} onChange={setEmailAlerts} isLight={isLight} />
            <ToggleRow label="Suspicious Activity" description="Notify on anomalous sign-ins and privilege escalation events." checked={suspiciousAlerts} onChange={setSuspiciousAlerts} isLight={isLight} />
            <ToggleRow label="Upload Anomaly Alerts" description="Notify on outlier upload behavior and file risk classifications." checked={uploadAlerts} onChange={setUploadAlerts} isLight={isLight} />
            <ToggleRow label="Anomaly Detection Events" description="Real-time heuristic scan results and threat classification changes." checked={anomalyAlerts} onChange={setAnomalyAlerts} isLight={isLight} />
            <ToggleRow label="Telemetry Digest" description="Periodic telemetry summary reports from the SOC relay pipeline." checked={telemetryAlerts} onChange={setTelemetryAlerts} isLight={isLight} />
            <ToggleRow label="SOC Relay Status" description="Relay node health changes, propagation failures, and vault sync events." checked={socRelayAlerts} onChange={setSocRelayAlerts} isLight={isLight} />
          </div>
        </section>

        {/* ── save bar ─────────────────────────────────────────── */}
        <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 ${isLight ? "border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]" : "border-white/[0.08] bg-[#111827]"}`}>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={savePhase === "loading"}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#1D4ED8] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]"
          >
            {savePhase === "loading"
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              : savePhase === "success"
                ? <CheckCircle2 className="h-4 w-4" aria-hidden />
                : <RefreshCw className="h-4 w-4" aria-hidden />}
            {savePhase === "loading" ? "Saving…" : savePhase === "success" ? "Saved" : "Save settings"}
          </button>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[12px] font-bold uppercase tracking-wide ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
              SECURE
            </span>
            <span className={`text-[13px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>AES-256-GCM · SOC relay sync</span>
          </div>
        </div>
      </div>
    </SocUserPageShell>
  );
}
