import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ClipboardCopy,
  Cpu,
  Globe2,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  MonitorSmartphone,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { changeAccountPassword } from "@/services/auth/authApi";
import { normalizeSocError } from "@/services/apiErrorHandler";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import {
  getProfileSecurity,
  patchProfileSecurity,
  removeTrustedDeviceRow,
  setDeviceTrusted,
} from "@/services/profileSecurityStore";
import { deviceFingerprint } from "@/services/userWorkspaceStore";
import { sanitizePlainText } from "@/utils/sanitize";
import { normalizeSocRole } from "@/utils/socPermissions";
import { estimatePasswordStrength } from "@/utils/validation";

const LANGS = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const ZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "Asia/Tokyo", "Asia/Singapore"];

function tabBtn(active, isLight, onClick, children, disabled = false) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
        active
          ? isLight
            ? "bg-sky-100 text-sky-900 shadow-sm"
            : "bg-[#3B82F6]/20 text-[#BFDBFE] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]"
          : isLight
            ? "text-slate-600 hover:bg-slate-100"
            : "text-[#94A3B8] hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

async function stall(ms = 340) {
  await new Promise((r) => window.setTimeout(r, ms));
}

export default memo(function EnterpriseProfilePage() {
  const { user, role, updateSessionUser } = useAuth();
  const wc = useWorkspaceControl();

  const isLight = wc.isLight;
  const soc = normalizeSocRole(user?.socRole);
  const isViewer = soc === "Viewer";

  const canManageOutboundKeys = wc.canManageApiKeys === true;
  const canRunSecurityWrites = !isViewer;
  const accentCard = isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/10 bg-[#111827]/90";
  const muted = isLight ? "text-slate-500" : "text-[#64748B]";

  const [tab, setTab] = useState("overview");
  const [nameDraft, setNameDraft] = useState(user?.fullName ?? "");
  const [busy, setBusy] = useState("");

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  const [secSnap, setSecSnap] = useState(() => (user?.email ? getProfileSecurity(user.email) : null));
  const [keyLabelDraft, setKeyLabelDraft] = useState("Integration key");

  /** @typedef {{ title: string, detail?: string, destructive?: boolean, confirmLabel?: string, onConfirm: () => unknown }} ConfirmSpec */
  const [confirmSpec, setConfirmSpec] = useState(/** @type {ConfirmSpec | null} */ (null));
  const [confirmBusy, setConfirmBusy] = useState(false);

  const workstationFingerprint = useMemo(() => deviceFingerprint(), []);

  useEffect(() => {
    setNameDraft(user?.fullName ?? "");
  }, [user?.fullName]);

  useEffect(() => {
    if (user?.email) setSecSnap(getProfileSecurity(user.email));
  }, [user?.email]);

  useEffect(() => {
    if (!confirmSpec) return;
    const handler = (e) => {
      if (e.key === "Escape" && !confirmBusy) setConfirmSpec(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmSpec, confirmBusy]);

  const pwdStrength = useMemo(() => estimatePasswordStrength(pwdNew), [pwdNew]);
  const pwdMismatch = pwdConfirm.length > 0 && pwdNew !== pwdConfirm;

  const push = useCallback(
    (m, tone) => {
      wc.pushToast(m, tone);
    },
    [wc],
  );

  const email = user?.email ?? "";
  const accountId = sanitizePlainText(user?.id || user?.accountId || workstationFingerprint.slice(0, 16), 32);
  const securityBadge = secSnap?.twoFactorEnabled ? "SECURE" : "WARNING";
  const lastLoginAt = sanitizePlainText(user?.lastLoginAt || user?.lastLogin || user?.updatedAt || "Not available", 48);

  const saveIdentity = async () => {
    setBusy("name");
    await stall(280);
    const next = sanitizePlainText(nameDraft, 120).trim();
    if (!next) {
      push("Display name cannot be empty.", "error");
      setBusy("");
      return;
    }
    const res = updateSessionUser({ fullName: next });
    if (!res?.ok) {
      push(res?.message ?? "Could not write session envelope.", "error");
      setBusy("");
      return;
    }
    push("Profile updated.", "success");
    setBusy("");
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    if (isViewer) return;
    if (pwdMismatch) {
      push("Password confirmation does not match the new password.", "error");
      return;
    }
    if (!pwdStrength.meetsPolicy) {
      push("New password does not meet strength requirements.", "error");
      return;
    }
    setBusy("pwd");
    await stall(200);
    try {
      await changeAccountPassword({
        email,
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });
      await updateSessionUser({ passwordRotatedAt: new Date().toISOString() });
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      push("Password changed.", "success");
    } catch (err) {
      push(normalizeSocError(err).message ?? "Password change declined.", "error");
    } finally {
      setBusy("");
    }
  };

  const refreshSecState = () => {
    if (email) setSecSnap(getProfileSecurity(email));
  };

  const copySecret = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      push("Secret copied to clipboard.", "success");
    } catch {
      push("Clipboard unavailable.", "error");
    }
  };

  const shellClass = useMemo(
    () =>
      [
        "min-h-[calc(100vh-72px)] p-6 md:p-8",
        isLight ? "bg-slate-100/90" : "bg-transparent",
      ].join(" "),
    [isLight],
  );

  return (
    <div className={shellClass}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className={`text-2xl font-semibold tracking-tight md:text-3xl ${isLight ? "text-slate-900" : "text-white"}`}>
            My Profile
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Enterprise account center — integrates with workspace preferences (
            <code className="font-mono text-[11px] text-[#38BDF8]">cdsv-workspace-prefs</code>) and session ledger. Fleet-wide
            MFA is configured separately under{" "}
            {role === "admin" ? (
              <Link to="/admin/settings" className="text-[#60A5FA] underline-offset-4 hover:underline">
                Security Control Center
              </Link>
            ) : (
              <span>SOC administrators</span>
            )}
            .
          </p>
          {isViewer ? (
            <div
              className={`mt-3 rounded-xl border px-4 py-2 text-sm ${
                isLight ? "border-amber-200 bg-amber-50 text-amber-900" : "border-amber-500/30 bg-amber-500/10 text-amber-100"
              }`}
              role="status"
            >
              SOC Viewer posture — credential rotation, trust controls, remote session termination, and API keys are delegated. Use an analyst or admin console to act.
            </div>
          ) : null}
        </header>

        <div className="flex flex-wrap gap-2">
          {tabBtn(tab === "overview", isLight, () => setTab("overview"), "Overview")}
          {tabBtn(tab === "security", isLight, () => setTab("security"), "Security")}
          {tabBtn(tab === "sessions", isLight, () => setTab("sessions"), "Sessions")}
        </div>

        {tab === "overview" ? (
          <div className="space-y-6">
            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <Shield className="h-4 w-4" /> Identity management panel
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile isLight={isLight} label="Name" value={sanitizePlainText(user?.fullName || "—", 80)} />
                <InfoTile isLight={isLight} label="Email" value={sanitizePlainText(email || "—", 120)} />
                <InfoTile isLight={isLight} label="Role" value={`${sanitizePlainText(role || "—", 24)} · ${soc}`} />
                <InfoTile isLight={isLight} label="Account ID" value={accountId} mono />
              </div>
            </section>

            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <Lock className="h-4 w-4" /> Security status
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile
                  isLight={isLight}
                  label="MFA"
                  value={secSnap?.twoFactorEnabled ? "Enabled" : "Disabled"}
                  badge={secSnap?.twoFactorEnabled ? "SECURE" : "WARNING"}
                />
                <InfoTile
                  isLight={isLight}
                  label="Password strength"
                  value={pwdNew.trim().length ? pwdStrength.label : "Awaiting new password"}
                  badge="SECURE"
                />
                <InfoTile isLight={isLight} label="Last login" value={lastLoginAt} mono />
              </div>
              <p className={`mt-3 text-[11px] ${muted}`}>
                Last updated a moment ago · status envelope{" "}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${securityBadge === "SECURE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>
                  {securityBadge}
                </span>
              </p>
            </section>

            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                  <Laptop className="h-4 w-4" /> Active devices
                </h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isLight ? "bg-slate-100 text-slate-700" : "bg-sky-500/15 text-sky-200"}`}>
                  {wc.sessions.length} sessions
                </span>
              </div>
              <ul className="space-y-2">
                {wc.sessions.slice(0, 4).map((s) => (
                  <li
                    key={`ov-${s.id}`}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${isLight ? "border-slate-100 bg-slate-50/80 hover:-translate-y-0.5" : "border-white/5 bg-[#0F172A]/80 hover:-translate-y-0.5 hover:border-sky-500/30"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sanitizePlainText(s.label, 80)}</p>
                      <p className={`text-xs ${muted}`}>{sanitizePlainText(s.location || "Unknown location", 80)}</p>
                      <p className={`text-[11px] ${muted}`}>Last active: {sanitizePlainText(s.lastSeenAt || s.createdAt || "a few min ago", 32)}</p>
                    </div>
                    {!s.current && wc.canTerminateRemoteSessions ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmSpec({
                            title: `Revoke "${sanitizePlainText(s.label, 100)}"?`,
                            detail: "This terminates the selected device session from the active SOC ledger.",
                            destructive: true,
                            confirmLabel: "Revoke",
                            onConfirm: () => wc.revokeSession(s.id),
                          })
                        }
                        className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-[#FECACA] transition hover:bg-red-500/20"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.current ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
                        {s.current ? "ACTIVE" : "STANDBY"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

          <motion.div layout className={`grid gap-6 lg:grid-cols-[260px_1fr]`}>
            <section className={`rounded-2xl border p-6 ${accentCard}`}>
              <div className="flex flex-col items-center text-center">
                <span
                  className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#3B82F6]/35 bg-[#2563EB]/15 text-2xl font-bold text-[#BFDBFE]"
                  aria-hidden
                >
                  {sanitizePlainText(user?.fullName ?? "?", 40)
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <User className={`mb-2 h-5 w-5 ${muted}`} aria-hidden />
                <div className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Principal</div>
                <div className={`break-all text-sm ${isLight ? "text-slate-800" : "text-[#F1F5F9]"}`}>
                  {sanitizePlainText(email, 200)}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-white/10 bg-[#0B1220]/60 px-2 py-0.5 text-[10px] font-semibold text-[#93C5FD]">
                    App · {sanitizePlainText(role ?? "—", 16)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-[#0B1220]/60 px-2 py-0.5 text-[10px] font-semibold text-[#FDE68A]">
                    SOC · {soc}
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className={`rounded-2xl border p-5 ${accentCard}`}>
                <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${muted}`}>Account</h2>
                <label className="mb-3 block">
                  <span className={`mb-1 block text-xs ${muted}`}>Display name · directory + headers</span>
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(sanitizePlainText(e.target.value, 120))}
                    disabled={isViewer}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B82F6]/50 disabled:opacity-40 ${
                      isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"
                    }`}
                  />
                </label>
                <button
                  type="button"
                  disabled={isViewer || busy === "name" || nameDraft.trim() === (user?.fullName ?? "").trim()}
                  onClick={() => void saveIdentity()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:opacity-45"
                >
                  {busy === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save identity
                </button>
              </div>

              <div className={`rounded-2xl border p-5 ${accentCard}`}>
                <h2 className={`mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                  <Globe2 className="h-4 w-4" /> Localization · shared with workspace menu
                </h2>
                <p className={`mb-4 text-[11px] ${muted}`}>
                  Persisted globally on this workstation — aligns with Header → Account dropdown.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={`mb-1 block text-xs ${muted}`}>Language (`html lang`)</span>
                    <select
                      value={wc.preferences.language}
                      onChange={(e) => {
                        wc.updatePreferences({ language: e.target.value });
                        push("Language preference updated.", "success");
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-sm ${
                        isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"
                      }`}
                    >
                      {LANGS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={`mb-1 block text-xs ${muted}`}>Timezone</span>
                    <select
                      value={wc.preferences.timezone}
                      onChange={(e) => {
                        wc.updatePreferences({ timezone: e.target.value });
                        push("Timezone preference updated.", "success");
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-sm ${
                        isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"
                      }`}
                    >
                      {ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={`rounded-2xl border p-5 ${accentCard}`}>
                <h2 className={`mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                  {wc.isLight ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-300" />}
                  Appearance · workspace shell
                </h2>
                <p className={`mb-4 text-[11px] ${muted}`}>
                  Matches header account menu and persists on this device (
                  <code className="font-mono text-[10px] text-[#38BDF8]">cdsv-theme</code>
                  ).
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "dark", label: "Dark", Icon: Moon },
                    { id: "light", label: "Light", Icon: Sun },
                  ].map(({ id, label, Icon }) => {
                    const selected = wc.theme === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          wc.setTheme(id);
                          push("Theme preference updated.", "success");
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                          selected
                            ? isLight
                              ? "border-sky-300 bg-sky-100 text-sky-900"
                              : "border-[#3B82F6]/50 bg-[#1E3A8A]/35 text-[#BFDBFE]"
                            : isLight
                              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : "border-white/10 bg-[#0F172A] text-[#E5E7EB] hover:bg-white/[0.05]"
                        }`}
                      >
                        <Icon className="h-4 w-4 opacity-80" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </motion.div>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="space-y-6">
            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <Lock className="h-4 w-4" /> Credential rotation
              </h2>
              <form onSubmit={onPasswordSubmit} className="max-w-xl space-y-3">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  placeholder="Current password"
                  disabled={!canRunSecurityWrites}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm disabled:opacity-40 ${
                    isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white"
                  }`}
                />
                <div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="New password · mixed case · number · symbol"
                    disabled={!canRunSecurityWrites}
                    aria-invalid={pwdNew.length > 0 && !pwdStrength.meetsPolicy}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm disabled:opacity-40 ${
                      pwdNew.length > 0 && !pwdStrength.meetsPolicy
                        ? isLight
                          ? "border-amber-300 bg-white"
                          : "border-amber-500/50 bg-[#0F172A] text-white"
                        : isLight
                          ? "border-slate-200 bg-white"
                          : "border-white/10 bg-[#0F172A] text-white"
                    }`}
                  />
                  <PasswordStrengthHint strength={pwdStrength} isLight={isLight} muted={muted} />
                </div>
                <div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={!canRunSecurityWrites}
                    aria-invalid={pwdMismatch}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm disabled:opacity-40 ${
                      pwdMismatch
                        ? isLight
                          ? "border-red-300 bg-white"
                          : "border-red-500/45 bg-[#0F172A] text-white"
                        : isLight
                          ? "border-slate-200 bg-white"
                          : "border-white/10 bg-[#0F172A] text-white"
                    }`}
                  />
                  {pwdMismatch ? (
                    <p className="mt-1.5 text-xs text-red-500" role="alert">
                      New password entries must match exactly.
                    </p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={
                    !canRunSecurityWrites ||
                    busy === "pwd" ||
                    pwdMismatch ||
                    !pwdCurrent ||
                    !pwdNew ||
                    !pwdConfirm ||
                    !pwdStrength.meetsPolicy
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2 text-sm font-medium text-[#FEE2E2] hover:bg-[#991B1B] disabled:opacity-45"
                >
                  {busy === "pwd" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update password
                </button>
              </form>
              {user?.passwordRotatedAt ? (
                <p className={`mt-3 text-[11px] ${muted}`}>
                  Last recorded rotation envelope:{" "}
                  <span className="font-mono">{sanitizePlainText(user.passwordRotatedAt, 40)}</span>
                </p>
              ) : null}
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <Shield className="h-4 w-4" /> Step-up MFA & trust
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRowLight
                  isLight={isLight}
                  muted={muted}
                  label="Authenticator / TOTP (simulated)"
                  description="Adds a mocked second factor latch for playbook-sensitive actions."
                  checked={Boolean(secSnap?.twoFactorEnabled)}
                  disabled={!canRunSecurityWrites}
                  busy={busy === "2fa"}
                  onToggle={async () => {
                    if (!canRunSecurityWrites) return;
                    const next = !secSnap?.twoFactorEnabled;
                    if (secSnap?.twoFactorEnabled && !next) {
                      setConfirmSpec({
                        title: "Turn off step-up MFA?",
                        detail:
                          "SOC playbooks that require a second factor on this workstation will no longer prompt the simulated TOTP latch until you re-enable it.",
                        destructive: true,
                        confirmLabel: "Disable 2FA",
                        onConfirm: async () => {
                          setBusy("2fa");
                          await stall(260);
                          patchProfileSecurity(email, { twoFactorEnabled: false });
                          refreshSecState();
                          push("2FA disabled on this console.", "warning");
                          setBusy("");
                        },
                      });
                      return;
                    }
                    setBusy("2fa");
                    await stall(260);
                    patchProfileSecurity(email, { twoFactorEnabled: true });
                    refreshSecState();
                    push("2FA enabled on this console.", "success");
                    setBusy("");
                  }}
                />
                <ToggleRowLight
                  isLight={isLight}
                  muted={muted}
                  label="Trusted devices only · identity plane"
                  description="Blocks unrecognized browser fingerprints outside this inventory (demo simulation)."
                  checked={Boolean(secSnap?.trustedOnly)}
                  disabled={!canRunSecurityWrites}
                  busy={busy === "trust-pol"}
                  onToggle={async () => {
                    if (!canRunSecurityWrites) return;
                    const next = !secSnap?.trustedOnly;
                    if (secSnap?.trustedOnly && !next) {
                      setConfirmSpec({
                        title: "Relax trusted-device gate?",
                        detail:
                          "New browser fingerprints could authenticate against this mocked identity plane without an explicit trust decision.",
                        destructive: true,
                        confirmLabel: "Allow any device class",
                        onConfirm: async () => {
                          setBusy("trust-pol");
                          await stall(260);
                          patchProfileSecurity(email, { trustedOnly: false });
                          refreshSecState();
                          push("Trusted-device enforcement disabled locally.", "warning");
                          setBusy("");
                        },
                      });
                      return;
                    }
                    setBusy("trust-pol");
                    await stall(260);
                    patchProfileSecurity(email, { trustedOnly: true });
                    refreshSecState();
                    push("Trusted-device enforcement enabled locally.", "success");
                    setBusy("");
                  }}
                />
              </div>
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                  <MonitorSmartphone className="h-4 w-4" /> Trusted device inventory
                </h2>
                <button
                  type="button"
                  disabled={!canRunSecurityWrites || busy === "dev-refresh"}
                  onClick={async () => {
                    setBusy("dev-refresh");
                    refreshSecState();
                    await stall(200);
                    push("Device attestations refreshed from local plane.", "success");
                    setBusy("");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:text-[#93C5FD] disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy === "dev-refresh" ? "animate-spin" : ""}`} />
                  Reload
                </button>
              </div>
              <ul className="space-y-2">
                {(secSnap?.devices ?? []).map((d) => (
                  <li
                    key={d.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                      isLight ? "border-slate-100 bg-slate-50/80" : "border-white/5 bg-[#0F172A]/80"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{sanitizePlainText(d.label, 80)}</span>
                      <div className={`text-[11px] font-mono ${muted}`}>{sanitizePlainText(d.userAgent ?? "", 120)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canRunSecurityWrites || busy === `td-${d.id}`}
                        onClick={async () => {
                          if (!canRunSecurityWrites) return;
                          setBusy(`td-${d.id}`);
                          await stall(200);
                          setDeviceTrusted(email, d.id, !d.trusted);
                          refreshSecState();
                          push(`${d.label} trust flag updated.`, "success");
                          setBusy("");
                        }}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                          d.trusted
                            ? "border-emerald-500/35 text-emerald-200"
                            : "border-white/15 text-[#CBD5F5]"
                        } disabled:opacity-40`}
                      >
                        {busy === `td-${d.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : d.trusted ? "Trusted" : "Mark trusted"}
                      </button>
                      <button
                        type="button"
                        disabled={!canRunSecurityWrites}
                        title="Remove device from attest cache"
                        onClick={() => {
                          if (!canRunSecurityWrites) return;
                          const labelSafe = sanitizePlainText(d.label, 80);
                          setConfirmSpec({
                            title: `Remove "${labelSafe}"?`,
                            detail:
                              "The device disappears from operator inventory until another session is simulated on that host fingerprint.",
                            destructive: true,
                            confirmLabel: "Remove device",
                            onConfirm: async () => {
                              setBusy(`rm-${d.id}`);
                              await stall(180);
                              const res = removeTrustedDeviceRow(email, d.id);
                              refreshSecState();
                              push(
                                res.ok ? "Trusted device removed from inventory." : res.message ?? "Remove blocked.",
                                res.ok ? "success" : "error",
                              );
                              setBusy("");
                            },
                          });
                        }}
                        className="rounded-lg border border-red-500/30 p-1.5 text-[#FECACA] disabled:opacity-40"
                      >
                        {busy === `rm-${d.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <KeyRound className="h-4 w-4" /> API keys · northbound mocks
              </h2>
              {!canManageOutboundKeys ? (
                <p className={`text-sm ${muted}`}>
                  {isViewer
                    ? "SOC Viewer posture blocks outbound SOC API material from this workstation."
                    : "API keys require an administrator workstation role — request minting coverage from your tenant owner."}
                </p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <input
                      value={keyLabelDraft}
                      onChange={(e) => setKeyLabelDraft(sanitizePlainText(e.target.value, 80))}
                      className={`min-w-[12rem] flex-1 rounded-xl border px-3 py-2 text-sm ${
                        isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={wc.keyActionId === "gen"}
                      onClick={() =>
                        setConfirmSpec({
                          title: "Generate a northbound SOC API key?",
                          detail:
                            "The plaintext secret renders once in-console. Operators must vault it externally before closing the envelope — it cannot be replayed from mock storage.",
                          confirmLabel: "Generate key",
                          onConfirm: () => wc.generateApiKey(keyLabelDraft),
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100"
                    >
                      {wc.keyActionId === "gen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                      Generate key
                    </button>
                  </div>
                  {wc.lastGeneratedSecret ? (
                    <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
                      <p className="text-[11px] font-semibold uppercase text-amber-100">Copy once envelope</p>
                      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-amber-50">
                        {wc.lastGeneratedSecret.plainText}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="text-xs text-amber-200 underline" onClick={() => copySecret(wc.lastGeneratedSecret.plainText)}>
                          <ClipboardCopy className="mr-1 inline h-3 w-3" />
                          Copy
                        </button>
                        <button type="button" className="text-xs text-amber-200/75" onClick={() => wc.clearRevealedSecret()}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className={`text-xs uppercase tracking-wide ${muted}`}>
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Label</th>
                          <th className="pb-2 pr-4 font-medium">Masked</th>
                          <th className="pb-2 pr-4 font-medium">Issued</th>
                          <th className="pb-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {(wc.keysLoading ? [] : wc.apiKeys).map((k) => (
                          <tr key={k.id} className={`border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                            <td className="py-2 pr-4">{sanitizePlainText(k.label, 80)}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{sanitizePlainText(k.secretRedacted ?? "", 40)}</td>
                            <td className={`py-2 pr-4 text-xs ${muted}`}>{sanitizePlainText(k.createdAt ?? "", 40)}</td>
                            <td className="py-2 text-right">
                              {!k.revoked ? (
                                <button
                                  type="button"
                                  disabled={wc.keyActionId === k.id}
                                  onClick={() =>
                                    setConfirmSpec({
                                      title: `Revoke API key "${sanitizePlainText(k.label, 80)}"?`,
                                      detail: "Upstream automations holding this bearer material will lose access immediately after revocation.",
                                      destructive: true,
                                      confirmLabel: "Revoke key",
                                      onConfirm: () => wc.revokeKey(k.id),
                                    })
                                  }
                                  className="text-xs font-semibold text-[#FECACA]"
                                >
                                  {wc.keyActionId === k.id ? "…" : "Revoke"}
                                </button>
                              ) : (
                                <span className={`text-xs ${muted}`}>Revoked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {wc.keysLoading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-[#64748B]">
                      <Loader2 className="h-5 w-5 animate-spin text-sky-400" /> Hydrating outbound key ledger…
                    </div>
                  ) : null}
                </>
              )}
            </motion.section>
          </div>
        ) : null}

        {tab === "sessions" ? (
          <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${muted}`}>
                <Activity className="h-4 w-4" /> Active operator sessions
              </h2>
              <button
                type="button"
                disabled={wc.sessionsLoading}
                onClick={() => void wc.reloadSessions()}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                  isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A]"
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${wc.sessionsLoading ? "animate-spin" : ""}`} />
                Resync ledger
              </button>
            </div>
            {wc.sessionsLoading ? (
              <div className="flex items-center gap-3 py-10 text-[#64748B]">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" /> Negotiating SOC session replicas…
              </div>
            ) : (
              <ul className="space-y-3">
                {wc.sessions.map((s) => (
                  <li
                    key={s.id}
                    className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                      s.current
                        ? isLight
                          ? "border-sky-300/70 bg-gradient-to-br from-sky-50 to-white shadow-sm ring-2 ring-sky-200"
                          : "border-sky-500/40 bg-gradient-to-br from-[#172554]/60 to-[#0F172A]/95 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)] ring-2 ring-[#2563EB]/35"
                        : isLight
                          ? "border-slate-100 bg-slate-50/80"
                          : "border-white/5 bg-[#0F172A]/80"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.current ? (
                          <Laptop className={`h-4 w-4 shrink-0 ${isLight ? "text-sky-600" : "text-sky-300"}`} aria-hidden />
                        ) : null}
                        <span className="font-medium">{sanitizePlainText(s.label, 100)}</span>
                        {s.current ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              isLight ? "bg-sky-600/15 text-sky-800" : "bg-[#2563EB]/35 text-[#BFDBFE]"
                            }`}
                          >
                            Current device
                          </span>
                        ) : null}
                      </div>
                      <div className={`mt-1 text-xs ${muted}`}>
                        {sanitizePlainText(s.location, 160)} · {sanitizePlainText(s.ip, 45)}
                      </div>
                      <div className={`text-[11px] ${muted}`}>{sanitizePlainText(s.deviceHint ?? "", 200)}</div>
                      {s.current ? (
                        <div className={`mt-2 flex flex-wrap items-center gap-2 ${muted}`}>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                            Bound fingerprint tail
                          </span>
                          <code
                            className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                              isLight ? "bg-slate-100 text-slate-800" : "bg-black/35 text-[#CBD5F5]"
                            }`}
                          >
                            {workstationFingerprint.length > 14
                              ? `…${workstationFingerprint.slice(-14)}`
                              : workstationFingerprint}
                          </code>
                        </div>
                      ) : null}
                    </div>
                    {!s.current && wc.canTerminateRemoteSessions ? (
                      <button
                        type="button"
                        disabled={wc.sessionActionId === s.id}
                        onClick={() =>
                          setConfirmSpec({
                            title: `Terminate session "${sanitizePlainText(s.label, 100)}"?`,
                            detail:
                              "The remote replica is ended and disappears from active session catalogs upon confirmation (mock ledger). Use logout here if this is your browser.",
                            destructive: true,
                            confirmLabel: "Terminate session",
                            onConfirm: () => wc.revokeSession(s.id),
                          })
                        }
                        className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-[#FECACA]"
                      >
                        {wc.sessionActionId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terminate"}
                      </button>
                    ) : (
                      !s.current && (
                        <span className={`text-[11px] ${muted}`}>Revocation delegated to elevated persona.</span>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        ) : null}

        <AnimatePresence>
          {confirmSpec ? (
            <ProfileConfirmDialog
              key="profile-confirm"
              isLight={isLight}
              spec={confirmSpec}
              busy={confirmBusy}
              onClose={() => {
                if (!confirmBusy) setConfirmSpec(null);
              }}
              onConfirm={async () => {
                const fn = confirmSpec?.onConfirm;
                if (!fn) return;
                setConfirmBusy(true);
                try {
                  await Promise.resolve(fn());
                } finally {
                  setConfirmBusy(false);
                  setConfirmSpec(null);
                }
              }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});

function ProfileConfirmDialog({ isLight, spec, busy, onClose, onConfirm }) {
  const destructive = Boolean(spec.destructive);
  return (
    <motion.div
      role="presentation"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.button
        type="button"
        aria-label="Dismiss dialog"
        disabled={busy}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-confirm-title"
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className={`relative max-w-md rounded-2xl border p-6 shadow-2xl ${
          isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/15 bg-[#111827] text-[#F1F5F9]"
        }`}
      >
        <h3 id="profile-confirm-title" className="text-lg font-semibold tracking-tight">
          {sanitizePlainText(spec.title, 200)}
        </h3>
        {spec.detail ? (
          <p className={`mt-2 text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-[#94A3B8]"}`}>{spec.detail}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              isLight ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border border-white/10 bg-transparent text-[#E5E7EB] hover:bg-white/[0.06]"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              destructive ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {spec.confirmLabel ?? "Continue"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasswordStrengthHint({ strength, isLight, muted }) {
  const bgSeg = isLight ? "bg-slate-200" : "bg-white/15";
  const colors = ["bg-red-500", "bg-amber-400", "bg-sky-500", "bg-emerald-500"];
  const { score, max, label, meetsPolicy, hints } = strength;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: max }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${i < score ? colors[Math.min(score - 1, colors.length - 1)] : bgSeg}`}
            />
          ))}
        </div>
        <span className={`shrink-0 text-[11px] font-semibold ${meetsPolicy ? "text-emerald-500" : "text-amber-500"}`}>
          {label}
        </span>
      </div>
      {!meetsPolicy && hints.length ? (
        <ul className={`mt-2 list-disc pl-4 text-[11px] ${muted}`}>
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : meetsPolicy ? (
        <p className={`mt-1.5 text-[11px] ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Meets SOC password posture.</p>
      ) : null}
    </div>
  );
}

function ToggleRowLight({ label, description, checked, onToggle, disabled, busy, isLight, muted }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/5 bg-[#0F172A]/70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`font-medium ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>{label}</div>
          <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>{description}</p>
        </div>
        <button
          type="button"
          disabled={disabled || busy}
          aria-pressed={checked}
          onClick={() => void onToggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            checked ? "bg-emerald-600" : isLight ? "bg-slate-300" : "bg-white/20"
          } disabled:opacity-40`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? "left-[26px]" : "left-0.5"}`}
          />
        </button>
      </div>
    </div>
  );
}

function InfoTile({ label, value, badge, mono = false, isLight }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${isLight ? "border-slate-100 bg-slate-50/80" : "border-white/5 bg-[#0F172A]/80"}`}>
      <p className={`text-[11px] uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#64748B]"}`}>{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`${mono ? "font-mono text-[12px]" : "text-sm"} font-medium ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>{value}</p>
        {badge ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge === "SECURE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}
