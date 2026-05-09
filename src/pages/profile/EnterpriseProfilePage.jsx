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
  LogOut,
  MonitorSmartphone,
  Moon,
  RefreshCw,
  Shield,
  ShieldCheck,
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

/* ─── security score engine ─────────────────────────────────────── */

function computeSecurityScore(secSnap, sessions = []) {
  let score = 100;
  if (!secSnap?.twoFactorEnabled) score -= 15;
  if (!secSnap?.trustedOnly) score -= 5;
  if ((secSnap?.devices ?? []).length === 0) score -= 10;
  if (sessions.length > 5) score -= 5;
  if (!secSnap?.twoFactorEnabled && sessions.length > 2) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function scoreProfile(score) {
  if (score >= 95) return { label: "Excellent", tone: "text-emerald-300", ring: "#10b981", bg: "bg-emerald-500/10 border-emerald-400/25 text-emerald-200" };
  if (score >= 80) return { label: "Secure", tone: "text-emerald-300", ring: "#10b981", bg: "bg-emerald-500/10 border-emerald-400/25 text-emerald-200" };
  if (score >= 60) return { label: "Medium Risk", tone: "text-amber-300", ring: "#f59e0b", bg: "bg-amber-500/10 border-amber-400/25 text-amber-200" };
  return { label: "Critical Risk", tone: "text-rose-300", ring: "#ef4444", bg: "bg-rose-500/10 border-rose-400/25 text-rose-200" };
}

/* ─── sub-components ────────────────────────────────────────────── */

function SecurityScoreRing({ score }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const profile = scoreProfile(score);
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg className="h-24 w-24 -rotate-90" aria-hidden>
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="6" />
          <circle
            cx="48" cy="48" r={r} fill="none"
            stroke={profile.ring} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[22px] font-black text-white tabular-nums">{score}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">posture</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">Account Security</p>
        <p className={`mt-1 text-[22px] font-bold ${profile.tone}`}>{profile.label}</p>
        <p className="mt-1 text-[13px] text-slate-400">
          {score >= 80 ? "Identity posture within SOC tolerance." : "Security posture requires attention."}
        </p>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange, isLight }) {
  return (
    <div className={`flex gap-1 rounded-xl border p-1 ${isLight ? "border-slate-200 bg-slate-100" : "border-white/10 bg-[#0b1628]/70"}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-lg px-5 py-2.5 text-[15px] font-medium transition-all duration-200 disabled:opacity-40 ${
            active === tab.id
              ? isLight
                ? "bg-white text-sky-800 shadow-sm"
                : "bg-[#2563EB] text-white shadow-[0_0_20px_-8px_rgba(59,130,246,0.7)]"
              : isLight
                ? "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function InfoTile({ label, value, badge, mono = false, isLight }) {
  const tileBase = isLight ? "border-slate-100 bg-slate-50/80" : "border-white/[0.07] bg-[#0F172A]/80";
  return (
    <div className={`rounded-xl border px-4 py-3 ${tileBase}`}>
      <p className={`text-[12px] font-semibold uppercase tracking-[0.18em] ${isLight ? "text-slate-500" : "text-slate-500"}`}>{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className={`${mono ? "font-mono text-[13px]" : "text-[15px]"} font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{value}</p>
        {badge ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge === "SECURE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRowLight({ label, description, checked, onToggle, disabled, busy, isLight, muted }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-[#0F172A]/70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[15px] font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{label}</div>
          <p className={`mt-1 text-[13px] leading-relaxed ${muted}`}>{description}</p>
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
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? "left-[26px]" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

function PasswordStrengthHint({ strength, isLight, muted }) {
  const bgSeg = isLight ? "bg-slate-200" : "bg-white/15";
  const colors = ["bg-rose-500", "bg-amber-400", "bg-sky-500", "bg-emerald-500"];
  const { score, max, label, meetsPolicy, hints } = strength;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: max }, (_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < score ? colors[Math.min(score - 1, colors.length - 1)] : bgSeg}`} />
          ))}
        </div>
        <span className={`shrink-0 text-[12px] font-semibold ${meetsPolicy ? "text-emerald-400" : "text-amber-400"}`}>{label}</span>
      </div>
      {!meetsPolicy && hints.length ? (
        <ul className={`mt-2 list-disc pl-4 text-[12px] ${muted}`}>
          {hints.map((h) => <li key={h}>{h}</li>)}
        </ul>
      ) : meetsPolicy ? (
        <p className={`mt-1.5 text-[12px] ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Meets SOC password policy.</p>
      ) : null}
    </div>
  );
}

async function stall(ms = 340) {
  await new Promise((r) => window.setTimeout(r, ms));
}

/* ─── main page ─────────────────────────────────────────────────── */

export default memo(function EnterpriseProfilePage() {
  const { user, role, updateSessionUser } = useAuth();
  const wc = useWorkspaceControl();

  const isLight = wc.isLight;
  const soc = normalizeSocRole(user?.socRole);
  const isViewer = soc === "Viewer";

  const canManageOutboundKeys = wc.canManageApiKeys === true;
  const canRunSecurityWrites = !isViewer;
  const accentCard = isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/[0.08] bg-[#111827]/90";
  const muted = isLight ? "text-slate-500" : "text-slate-500";

  const [tab, setTab] = useState("overview");
  const [nameDraft, setNameDraft] = useState(user?.fullName ?? "");
  const [busy, setBusy] = useState("");

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  const [secSnap, setSecSnap] = useState(() => (user?.email ? getProfileSecurity(user.email) : null));
  const [keyLabelDraft, setKeyLabelDraft] = useState("Integration key");

  const [confirmSpec, setConfirmSpec] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const workstationFingerprint = useMemo(() => deviceFingerprint(), []);

  useEffect(() => { setNameDraft(user?.fullName ?? ""); }, [user?.fullName]);
  useEffect(() => { if (user?.email) setSecSnap(getProfileSecurity(user.email)); }, [user?.email]);
  useEffect(() => {
    if (!confirmSpec) return;
    const handler = (e) => { if (e.key === "Escape" && !confirmBusy) setConfirmSpec(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmSpec, confirmBusy]);

  const pwdStrength = useMemo(() => estimatePasswordStrength(pwdNew), [pwdNew]);
  const pwdMismatch = pwdConfirm.length > 0 && pwdNew !== pwdConfirm;

  const push = useCallback((m, tone) => { wc.pushToast(m, tone); }, [wc]);

  const email = user?.email ?? "";
  const accountId = sanitizePlainText(user?.id || user?.accountId || workstationFingerprint.slice(0, 16), 32);
  const lastLoginAt = sanitizePlainText(user?.lastLoginAt || user?.lastLogin || user?.updatedAt || "Not recorded", 48);

  const securityScore = useMemo(
    () => computeSecurityScore(secSnap, wc.sessions),
    [secSnap, wc.sessions],
  );
  const scoreInfo = scoreProfile(securityScore);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "security", label: "Security" },
    { id: "sessions", label: "Sessions" },
  ];

  const saveIdentity = async () => {
    setBusy("name");
    await stall(280);
    const next = sanitizePlainText(nameDraft, 120).trim();
    if (!next) { push("Display name cannot be empty.", "error"); setBusy(""); return; }
    const res = updateSessionUser({ fullName: next });
    if (!res?.ok) { push(res?.message ?? "Could not update identity record.", "error"); setBusy(""); return; }
    push("Identity record updated.", "success");
    setBusy("");
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    if (isViewer) return;
    if (pwdMismatch) { push("Password confirmation does not match.", "error"); return; }
    if (!pwdStrength.meetsPolicy) { push("New password does not meet strength requirements.", "error"); return; }
    setBusy("pwd");
    await stall(200);
    try {
      await changeAccountPassword({ email, currentPassword: pwdCurrent, newPassword: pwdNew });
      await updateSessionUser({ passwordRotatedAt: new Date().toISOString() });
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
      push("Password updated successfully.", "success");
    } catch (err) {
      push(normalizeSocError(err).message ?? "Password change declined.", "error");
    } finally {
      setBusy("");
    }
  };

  const refreshSecState = () => { if (email) setSecSnap(getProfileSecurity(email)); };

  const copySecret = async (text) => {
    try { await navigator.clipboard.writeText(text); push("Secret copied to clipboard.", "success"); }
    catch { push("Clipboard unavailable.", "error"); }
  };

  const shellClass = useMemo(
    () => "min-h-[calc(100vh-72px)] p-6 md:p-8 xl:px-10 2xl:px-12",
    [],
  );

  return (
    <div className={shellClass}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── header ──────────────────────────────────────────────── */}
        <header>
          <h1 className={`text-[36px] font-semibold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            My Profile
          </h1>
          <p className={`mt-1 text-[15px] ${muted}`}>
            Account security, session management, and identity preferences.{" "}
            {role === "admin" ? (
              <Link to="/admin/settings" className="text-sky-400 underline-offset-4 hover:underline">
                Fleet-wide controls are in Admin Settings.
              </Link>
            ) : (
              <span>Contact your SOC administrator for fleet-wide policy changes.</span>
            )}
          </p>
          {isViewer ? (
            <div className={`mt-3 rounded-xl border px-4 py-2.5 text-[13px] ${isLight ? "border-amber-200 bg-amber-50 text-amber-900" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`} role="status">
              SOC Viewer posture — credential rotation, trust controls, and remote session termination require Analyst or Admin access.
            </div>
          ) : null}
        </header>

        {/* ── tabs ────────────────────────────────────────────────── */}
        <TabBar tabs={tabs} active={tab} onChange={setTab} isLight={isLight} />

        {/* ── overview tab ────────────────────────────────────────── */}
        {tab === "overview" ? (
          <div className="space-y-6">
            {/* security score banner */}
            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <SecurityScoreRing score={securityScore} />
                <div className="flex flex-wrap gap-3">
                  <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-[#0F172A]/60"}`}>
                    <ShieldCheck className={`h-4 w-4 ${secSnap?.twoFactorEnabled ? "text-emerald-400" : "text-amber-400"}`} aria-hidden />
                    <span className={`text-[13px] font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                      MFA {secSnap?.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-[#0F172A]/60"}`}>
                    <Laptop className="h-4 w-4 text-sky-400" aria-hidden />
                    <span className={`text-[13px] font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                      {wc.sessions.length} Active Session{wc.sessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.07] bg-[#0F172A]/60"}`}>
                    <MonitorSmartphone className="h-4 w-4 text-cyan-400" aria-hidden />
                    <span className={`text-[13px] font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                      {(secSnap?.devices ?? []).length} Trusted Device{(secSnap?.devices ?? []).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* identity panel */}
            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-4 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <Shield className="h-4 w-4" /> Identity
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile isLight={isLight} label="Full Name" value={sanitizePlainText(user?.fullName || "—", 80)} />
                <InfoTile isLight={isLight} label="Email" value={sanitizePlainText(email || "—", 120)} />
                <InfoTile isLight={isLight} label="Role" value={`${sanitizePlainText(role || "—", 24)} · ${soc}`} />
                <InfoTile isLight={isLight} label="Account ID" value={accountId} mono />
              </div>
            </section>

            {/* security status */}
            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-4 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <Lock className="h-4 w-4" /> Security Status
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <InfoTile isLight={isLight} label="MFA" value={secSnap?.twoFactorEnabled ? "Enabled" : "Disabled"} badge={secSnap?.twoFactorEnabled ? "SECURE" : "WARNING"} />
                <InfoTile isLight={isLight} label="Password Strength" value={pwdNew.trim().length ? pwdStrength.label : "Last rotated unknown"} badge="SECURE" />
                <InfoTile isLight={isLight} label="Last Login" value={lastLoginAt} mono />
              </div>
              <p className={`mt-3 text-[12px] ${muted}`}>
                Security posture score:{" "}
                <span className={`font-bold ${scoreInfo.tone}`}>{securityScore}/100 · {scoreInfo.label}</span>
              </p>
            </section>

            {/* active devices (overview) */}
            <section className={`rounded-2xl border p-5 ${accentCard}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                  <Laptop className="h-4 w-4" /> Active Sessions
                </h2>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isLight ? "bg-slate-100 text-slate-700" : "bg-sky-500/15 text-sky-200"}`}>
                  {wc.sessions.length} sessions
                </span>
              </div>
              <ul className="space-y-2">
                {wc.sessions.slice(0, 4).map((s) => (
                  <li key={`ov-${s.id}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${isLight ? "border-slate-100 bg-slate-50/80 hover:-translate-y-0.5" : "border-white/[0.06] bg-[#0F172A]/80 hover:-translate-y-0.5 hover:border-sky-500/25"}`}>
                    <div className="min-w-0">
                      <p className={`text-[15px] font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{sanitizePlainText(s.label, 80)}</p>
                      <p className={`text-[13px] ${muted}`}>{sanitizePlainText(s.location || "Unknown location", 80)}</p>
                      <p className={`text-[12px] ${muted}`}>Last active: {sanitizePlainText(s.lastSeenAt || s.createdAt || "recently", 32)}</p>
                    </div>
                    {!s.current && wc.canTerminateRemoteSessions ? (
                      <button type="button" onClick={() => setConfirmSpec({ title: `Revoke "${sanitizePlainText(s.label, 100)}"?`, detail: "This terminates the selected device session from the active session ledger.", destructive: true, confirmLabel: "Revoke", onConfirm: () => wc.revokeSession(s.id) })} className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-[13px] font-semibold text-rose-200 transition hover:bg-rose-500/20">
                        Revoke
                      </button>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${s.current ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
                        {s.current ? "ACTIVE" : "STANDBY"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <motion.div layout className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
              {/* avatar + role card */}
              <section className={`rounded-2xl border p-5 ${accentCard}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <span
                      className={`flex h-20 w-20 items-center justify-center rounded-full border-2 text-[20px] font-bold ${
                        isLight
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-[#2563EB]/40 bg-[#1E3A8A]/20 text-sky-200"
                      }`}
                      aria-hidden
                    >
                      {(() => { const parts = sanitizePlainText(user?.fullName ?? "?", 40).trim().split(/\s+/).filter(Boolean); return parts.length === 0 ? "U" : parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase(); })()}
                    </span>
                    <span
                      className={`absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 ${
                        isLight ? "border-white" : "border-[#111827]"
                      } ${securityScore >= 80 ? "bg-emerald-400" : securityScore >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                    />
                  </div>
                  <User className={`mb-1.5 h-3.5 w-3.5 ${muted}`} aria-hidden />
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${muted}`}>Principal</div>
                  <div className={`mt-0.5 break-all text-[14px] font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                    {sanitizePlainText(email, 200)}
                  </div>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${isLight ? "border-blue-200 bg-blue-50 text-blue-700" : "border-white/10 bg-sky-900/40 text-sky-300"}`}>
                      {sanitizePlainText(role ?? "—", 16)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-white/10 bg-amber-900/30 text-amber-300"}`}>
                      SOC · {soc}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                {/* display name */}
                <div className={`rounded-2xl border p-5 ${accentCard}`}>
                  <h2 className={`mb-3 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>Account</h2>
                  <label className="mb-3 block">
                    <span className={`mb-1.5 block text-[13px] font-semibold ${muted}`}>Display name</span>
                    <input value={nameDraft} onChange={(e) => setNameDraft(sanitizePlainText(e.target.value, 120))} disabled={isViewer}
                      className={`w-full rounded-xl border px-4 py-2.5 text-[15px] outline-none transition focus:ring-2 focus:ring-[#3B82F6]/50 disabled:opacity-40 ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"}`}
                    />
                  </label>
                  <button type="button" disabled={isViewer || busy === "name" || nameDraft.trim() === (user?.fullName ?? "").trim()} onClick={() => void saveIdentity()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#1D4ED8] disabled:opacity-45 active:scale-[0.98]"
                  >
                    {busy === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </button>
                </div>

                {/* localization */}
                <div className={`rounded-2xl border p-5 ${accentCard}`}>
                  <h2 className={`mb-1 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                    <Globe2 className="h-4 w-4" /> Localization
                  </h2>
                  <p className={`mb-4 text-[13px] ${muted}`}>Language and timezone preferences apply across the entire workspace.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={`mb-1.5 block text-[13px] font-semibold ${muted}`}>Language</span>
                      <select value={wc.preferences.language} onChange={(e) => { wc.updatePreferences({ language: e.target.value }); push("Language updated.", "success"); }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-[15px] ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"}`}
                      >
                        {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={`mb-1.5 block text-[13px] font-semibold ${muted}`}>Timezone</span>
                      <select value={wc.preferences.timezone} onChange={(e) => { wc.updatePreferences({ timezone: e.target.value }); push("Timezone updated.", "success"); }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-[15px] ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-[#0F172A] text-white"}`}
                      >
                        {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </label>
                  </div>
                </div>

                {/* appearance */}
                <div className={`rounded-2xl border p-5 ${accentCard}`}>
                  <h2 className={`mb-1 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                    {wc.isLight ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-300" />}
                    Appearance
                  </h2>
                  <p className={`mb-4 text-[13px] ${muted}`}>Workspace color scheme — persisted on this device.</p>
                  <div className="flex flex-wrap gap-2">
                    {[{ id: "dark", label: "Dark", Icon: Moon }, { id: "light", label: "Light", Icon: Sun }].map(({ id, label, Icon }) => {
                      const selected = wc.theme === id;
                      return (
                        <button key={id} type="button" onClick={() => { wc.setTheme(id); push("Appearance updated.", "success"); }}
                          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[15px] font-medium transition hover:-translate-y-px active:scale-[0.98] ${selected ? (isLight ? "border-sky-300 bg-sky-100 text-sky-900" : "border-[#3B82F6]/50 bg-[#1E3A8A]/35 text-sky-200") : (isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-white/10 bg-[#0F172A] text-slate-200 hover:bg-white/[0.05]")}`}
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

        {/* ── security tab ─────────────────────────────────────────── */}
        {tab === "security" ? (
          <div className="space-y-6">
            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-2 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <Lock className="h-4 w-4" /> Credential Rotation
              </h2>
              <form onSubmit={onPasswordSubmit} className="max-w-xl space-y-3">
                <input type="password" autoComplete="current-password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} placeholder="Current password" disabled={!canRunSecurityWrites}
                  className={`w-full rounded-xl border px-4 py-2.5 text-[15px] disabled:opacity-40 ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white"}`}
                />
                <div>
                  <input type="password" autoComplete="new-password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="New password — mixed case, number, symbol" disabled={!canRunSecurityWrites} aria-invalid={pwdNew.length > 0 && !pwdStrength.meetsPolicy}
                    className={`w-full rounded-xl border px-4 py-2.5 text-[15px] disabled:opacity-40 ${pwdNew.length > 0 && !pwdStrength.meetsPolicy ? (isLight ? "border-amber-300 bg-white" : "border-amber-500/50 bg-[#0F172A] text-white") : (isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white")}`}
                  />
                  <PasswordStrengthHint strength={pwdStrength} isLight={isLight} muted={muted} />
                </div>
                <div>
                  <input type="password" autoComplete="new-password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} placeholder="Confirm new password" disabled={!canRunSecurityWrites} aria-invalid={pwdMismatch}
                    className={`w-full rounded-xl border px-4 py-2.5 text-[15px] disabled:opacity-40 ${pwdMismatch ? (isLight ? "border-rose-300 bg-white" : "border-rose-500/45 bg-[#0F172A] text-white") : (isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white")}`}
                  />
                  {pwdMismatch ? <p className="mt-1.5 text-[13px] text-rose-400" role="alert">Passwords must match exactly.</p> : null}
                </div>
                <button type="submit" disabled={!canRunSecurityWrites || busy === "pwd" || pwdMismatch || !pwdCurrent || !pwdNew || !pwdConfirm || !pwdStrength.meetsPolicy}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-[15px] font-semibold text-rose-100 transition hover:-translate-y-px hover:bg-[#991B1B] disabled:opacity-45 active:scale-[0.98]"
                >
                  {busy === "pwd" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update password
                </button>
              </form>
              {user?.passwordRotatedAt ? (
                <p className={`mt-3 text-[12px] ${muted}`}>Last rotation: <span className="font-mono">{sanitizePlainText(user.passwordRotatedAt, 40)}</span></p>
              ) : null}
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-3 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <Shield className="h-4 w-4" /> Multi-Factor Authentication
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRowLight isLight={isLight} muted={muted} label="Authenticator App (TOTP)" description="Requires a time-based one-time code for privileged actions on this console." checked={Boolean(secSnap?.twoFactorEnabled)} disabled={!canRunSecurityWrites} busy={busy === "2fa"}
                  onToggle={async () => {
                    if (!canRunSecurityWrites) return;
                    if (secSnap?.twoFactorEnabled) {
                      setConfirmSpec({ title: "Disable MFA?", detail: "SOC actions requiring a second factor will no longer require code verification until re-enabled.", destructive: true, confirmLabel: "Disable MFA", onConfirm: async () => { setBusy("2fa"); await stall(260); patchProfileSecurity(email, { twoFactorEnabled: false }); refreshSecState(); push("MFA disabled.", "warning"); setBusy(""); } });
                      return;
                    }
                    setBusy("2fa"); await stall(260); patchProfileSecurity(email, { twoFactorEnabled: true }); refreshSecState(); push("MFA enabled — security posture improved.", "success"); setBusy("");
                  }}
                />
                <ToggleRowLight isLight={isLight} muted={muted} label="Trusted Devices Only" description="Blocks authentication from unrecognized browser or device fingerprints not in your trusted inventory." checked={Boolean(secSnap?.trustedOnly)} disabled={!canRunSecurityWrites} busy={busy === "trust-pol"}
                  onToggle={async () => {
                    if (!canRunSecurityWrites) return;
                    if (secSnap?.trustedOnly) {
                      setConfirmSpec({ title: "Relax trusted-device gate?", detail: "New browser fingerprints will be able to authenticate without an explicit trust decision.", destructive: true, confirmLabel: "Allow any device", onConfirm: async () => { setBusy("trust-pol"); await stall(260); patchProfileSecurity(email, { trustedOnly: false }); refreshSecState(); push("Trusted-device enforcement disabled.", "warning"); setBusy(""); } });
                      return;
                    }
                    setBusy("trust-pol"); await stall(260); patchProfileSecurity(email, { trustedOnly: true }); refreshSecState(); push("Trusted-device enforcement enabled.", "success"); setBusy("");
                  }}
                />
              </div>
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className={`flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                  <MonitorSmartphone className="h-4 w-4" /> Trusted Device Inventory
                </h2>
                <button type="button" disabled={!canRunSecurityWrites || busy === "dev-refresh"} onClick={async () => { setBusy("dev-refresh"); refreshSecState(); await stall(200); push("Device inventory refreshed.", "success"); setBusy(""); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition hover:-translate-y-px ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-transparent text-sky-400 hover:text-sky-300"} disabled:opacity-40`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy === "dev-refresh" ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <ul className="space-y-2">
                {(secSnap?.devices ?? []).map((d) => (
                  <li key={d.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[15px] ${isLight ? "border-slate-100 bg-slate-50/80" : "border-white/[0.06] bg-[#0F172A]/80"}`}>
                    <div>
                      <span className={`font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{sanitizePlainText(d.label, 80)}</span>
                      <div className={`text-[12px] font-mono ${muted}`}>{sanitizePlainText(d.userAgent ?? "", 120)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={!canRunSecurityWrites || busy === `td-${d.id}`} onClick={async () => { if (!canRunSecurityWrites) return; setBusy(`td-${d.id}`); await stall(200); setDeviceTrusted(email, d.id, !d.trusted); refreshSecState(); push(`${d.label} trust updated.`, "success"); setBusy(""); }}
                        className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition ${d.trusted ? "border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10" : "border-white/15 text-slate-300 hover:bg-white/[0.06]"} disabled:opacity-40`}
                      >
                        {busy === `td-${d.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : d.trusted ? "Trusted" : "Mark trusted"}
                      </button>
                      <button type="button" disabled={!canRunSecurityWrites} title="Remove from inventory" onClick={() => { if (!canRunSecurityWrites) return; const lb = sanitizePlainText(d.label, 80); setConfirmSpec({ title: `Remove "${lb}"?`, detail: "The device is removed from your trusted inventory. It can be re-added on next authentication.", destructive: true, confirmLabel: "Remove device", onConfirm: async () => { setBusy(`rm-${d.id}`); await stall(180); const res = removeTrustedDeviceRow(email, d.id); refreshSecState(); push(res.ok ? "Device removed from inventory." : res.message ?? "Remove failed.", res.ok ? "success" : "error"); setBusy(""); } }); }}
                        className="rounded-lg border border-rose-500/30 p-2 text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40"
                      >
                        {busy === `rm-${d.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </li>
                ))}
                {(secSnap?.devices ?? []).length === 0 ? (
                  <li className={`rounded-xl border border-dashed px-4 py-6 text-center text-[13px] ${isLight ? "border-slate-200 text-slate-400" : "border-white/10 text-slate-500"}`}>
                    No trusted devices registered. Devices appear here after verified authentication.
                  </li>
                ) : null}
              </ul>
            </motion.section>

            <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
              <h2 className={`mb-3 flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <KeyRound className="h-4 w-4" /> API Integration Keys
              </h2>
              {!canManageOutboundKeys ? (
                <p className={`text-[15px] ${muted}`}>
                  {isViewer ? "API key management requires Analyst or Admin access." : "API keys require an administrator role — request access from your tenant owner."}
                </p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <input value={keyLabelDraft} onChange={(e) => setKeyLabelDraft(sanitizePlainText(e.target.value, 80))}
                      className={`min-w-[12rem] flex-1 rounded-xl border px-3 py-2.5 text-[15px] ${isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#0F172A] text-white"}`}
                    />
                    <button type="button" disabled={wc.keyActionId === "gen"} onClick={() => setConfirmSpec({ title: "Generate API integration key?", detail: "The plaintext secret is shown once. Store it in a secure vault immediately — it cannot be retrieved again.", confirmLabel: "Generate", onConfirm: () => wc.generateApiKey(keyLabelDraft) })}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-[15px] font-semibold text-emerald-100 transition hover:-translate-y-px hover:bg-emerald-500/15 active:scale-[0.98]"
                    >
                      {wc.keyActionId === "gen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                      Generate
                    </button>
                  </div>
                  {wc.lastGeneratedSecret ? (
                    <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
                      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-amber-200">Show once — copy immediately</p>
                      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-amber-50">{wc.lastGeneratedSecret.plainText}</pre>
                      <div className="mt-2 flex gap-3">
                        <button type="button" className="inline-flex items-center gap-1.5 text-[13px] text-amber-300 hover:text-amber-200" onClick={() => copySecret(wc.lastGeneratedSecret.plainText)}>
                          <ClipboardCopy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button type="button" className="text-[13px] text-amber-200/60 hover:text-amber-200" onClick={() => wc.clearRevealedSecret()}>Dismiss</button>
                      </div>
                    </div>
                  ) : null}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[15px]">
                      <thead className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${muted}`}>
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Label</th>
                          <th className="pb-2 pr-4 font-medium">Key (masked)</th>
                          <th className="pb-2 pr-4 font-medium">Issued</th>
                          <th className="pb-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {(wc.keysLoading ? [] : wc.apiKeys).map((k) => (
                          <tr key={k.id} className={`border-t ${isLight ? "border-slate-100" : "border-white/[0.06]"}`}>
                            <td className="py-2.5 pr-4">{sanitizePlainText(k.label, 80)}</td>
                            <td className="py-2.5 pr-4 font-mono text-[13px]">{sanitizePlainText(k.secretRedacted ?? "", 40)}</td>
                            <td className={`py-2.5 pr-4 text-[13px] ${muted}`}>{sanitizePlainText(k.createdAt ?? "", 40)}</td>
                            <td className="py-2.5 text-right">
                              {!k.revoked ? (
                                <button type="button" disabled={wc.keyActionId === k.id} onClick={() => setConfirmSpec({ title: `Revoke "${sanitizePlainText(k.label, 80)}"?`, detail: "Integrations using this key will lose access immediately.", destructive: true, confirmLabel: "Revoke key", onConfirm: () => wc.revokeKey(k.id) })} className="text-[13px] font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-40">
                                  {wc.keyActionId === k.id ? "…" : "Revoke"}
                                </button>
                              ) : (
                                <span className={`text-[13px] ${muted}`}>Revoked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {wc.keysLoading ? (
                    <div className="flex items-center gap-2 py-6 text-[13px] text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-sky-400" /> Loading integration keys…</div>
                  ) : null}
                </>
              )}
            </motion.section>
          </div>
        ) : null}

        {/* ── sessions tab ─────────────────────────────────────────── */}
        {tab === "sessions" ? (
          <motion.section layout className={`rounded-2xl border p-5 ${accentCard}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className={`flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
                <Activity className="h-4 w-4" /> Active Sessions
              </h2>
              <button type="button" disabled={wc.sessionsLoading} onClick={() => void wc.reloadSessions()}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-semibold transition hover:-translate-y-px active:scale-[0.98] ${isLight ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-[#0F172A] text-slate-300 hover:text-white"}`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${wc.sessionsLoading ? "animate-spin" : ""}`} />
                Reload
              </button>
            </div>
            {wc.sessionsLoading ? (
              <div className="flex items-center gap-3 py-10 text-slate-500"><Loader2 className="h-8 w-8 animate-spin text-sky-400" /> Fetching active sessions…</div>
            ) : (
              <ul className="space-y-3">
                {wc.sessions.map((s) => (
                  <li key={s.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-4 ${s.current ? (isLight ? "border-sky-300/70 bg-sky-50 ring-2 ring-sky-200/50" : "border-sky-500/40 bg-[#172554]/30 ring-2 ring-[#2563EB]/25") : (isLight ? "border-slate-100 bg-slate-50/80" : "border-white/[0.06] bg-[#0F172A]/80")}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.current ? <Laptop className={`h-4 w-4 shrink-0 ${isLight ? "text-sky-600" : "text-sky-300"}`} aria-hidden /> : null}
                        <span className={`text-[15px] font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{sanitizePlainText(s.label, 100)}</span>
                        {s.current ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${isLight ? "bg-sky-100 text-sky-700" : "bg-[#2563EB]/30 text-sky-200"}`}>Current</span>
                        ) : null}
                      </div>
                      <div className={`mt-1 text-[13px] ${muted}`}>{sanitizePlainText(s.location, 160)} · {sanitizePlainText(s.ip, 45)}</div>
                      <div className={`text-[12px] ${muted}`}>{sanitizePlainText(s.deviceHint ?? "", 200)}</div>
                      {s.current ? (
                        <div className={`mt-2 flex flex-wrap items-center gap-2 ${muted}`}>
                          <span className={`text-[11px] font-semibold uppercase tracking-[0.14em]`}>Device fingerprint</span>
                          <code className={`rounded px-2 py-0.5 font-mono text-[11px] ${isLight ? "bg-slate-100 text-slate-700" : "bg-black/35 text-slate-300"}`}>
                            {workstationFingerprint.length > 14 ? `…${workstationFingerprint.slice(-14)}` : workstationFingerprint}
                          </code>
                        </div>
                      ) : null}
                    </div>
                    {!s.current && wc.canTerminateRemoteSessions ? (
                      <button type="button" disabled={wc.sessionActionId === s.id} onClick={() => setConfirmSpec({ title: `Terminate "${sanitizePlainText(s.label, 100)}"?`, detail: "The session is immediately revoked and the device loses access.", destructive: true, confirmLabel: "Terminate session", onConfirm: () => wc.revokeSession(s.id) })}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[13px] font-semibold text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.98]"
                      >
                        {wc.sessionActionId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                        Terminate
                      </button>
                    ) : !s.current ? (
                      <span className={`text-[12px] ${muted}`}>Requires elevated permissions.</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        ) : null}

        {/* ── confirm dialog ───────────────────────────────────────── */}
        <AnimatePresence>
          {confirmSpec ? (
            <ProfileConfirmDialog key="profile-confirm" isLight={isLight} spec={confirmSpec} busy={confirmBusy}
              onClose={() => { if (!confirmBusy) setConfirmSpec(null); }}
              onConfirm={async () => {
                const fn = confirmSpec?.onConfirm;
                if (!fn) return;
                setConfirmBusy(true);
                try { await Promise.resolve(fn()); } finally { setConfirmBusy(false); setConfirmSpec(null); }
              }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});

/* ─── confirm dialog ─────────────────────────────────────────────── */

function ProfileConfirmDialog({ isLight, spec, busy, onClose, onConfirm }) {
  const destructive = Boolean(spec.destructive);
  return (
    <motion.div role="presentation" className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <motion.button type="button" aria-label="Dismiss" disabled={busy} className="absolute inset-0 bg-black/60" onClick={() => !busy && onClose()} />
      <motion.div role="dialog" aria-modal="true" aria-labelledby="profile-confirm-title"
        initial={{ scale: 0.96, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 6 }} transition={{ duration: 0.18 }}
        className={`relative max-w-md rounded-2xl border p-6 shadow-2xl ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/15 bg-[#111827] text-white"}`}
      >
        <h3 id="profile-confirm-title" className="text-[20px] font-semibold">{sanitizePlainText(spec.title, 200)}</h3>
        {spec.detail ? <p className={`mt-2 text-[15px] leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>{spec.detail}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose}
            className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold transition hover:-translate-y-px active:scale-[0.98] ${isLight ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border border-white/10 bg-transparent text-slate-200 hover:bg-white/[0.06]"}`}
          >
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void onConfirm()}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold text-white transition hover:-translate-y-px active:scale-[0.98] disabled:opacity-50 ${destructive ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#2563EB] hover:bg-[#1D4ED8]"}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {spec.confirmLabel ?? "Continue"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
