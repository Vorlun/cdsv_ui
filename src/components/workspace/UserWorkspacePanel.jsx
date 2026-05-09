import { memo, useEffect } from "react";

/* ─── initials helper ────────────────────────────────────────────── */
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
import {
  Activity,
  Globe2,
  Lock,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { sanitizePlainText } from "@/utils/sanitize";
import { normalizeSocRole } from "@/utils/socPermissions";

/* ─── quick action button ────────────────────────────────────────── */

function QuickAction({ icon: Icon, label, onClick, tone = "default", isLight }) {
  const tones = {
    default: isLight
      ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
    danger: isLight
      ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      : "text-rose-300 hover:bg-rose-500/10 hover:text-rose-200",
    warning: isLight
      ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
      : "text-amber-300 hover:bg-amber-500/10 hover:text-amber-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150 ${tones[tone]}`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      {label}
    </button>
  );
}

/* ─── section divider ────────────────────────────────────────────── */

function Divider({ isLight }) {
  return (
    <div
      className={`mx-4 border-t ${isLight ? "border-slate-100" : "border-white/[0.07]"}`}
    />
  );
}

/* ─── section label ──────────────────────────────────────────────── */

function SectionLabel({ children, isLight }) {
  return (
    <p
      className={`mb-1 px-3 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] ${
        isLight ? "text-slate-400" : "text-slate-600"
      }`}
    >
      {children}
    </p>
  );
}

/* ─── panel ──────────────────────────────────────────────────────── */

export default memo(function UserWorkspacePanel({ user, role, onClose }) {
  const navigate = useNavigate();
  const wc = useWorkspaceControl();
  const isLight = wc.isLight;

  const email = user?.email ?? "";
  const name = sanitizePlainText(user?.fullName ?? user?.name ?? "Operator", 80);
  const soc = normalizeSocRole(user?.socRole);

  /* ── ESC key to close ──────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const currentSession = wc.sessions.find((s) => s.current);
  const recentSessions = wc.sessions.filter((s) => !s.current).slice(0, 2);

  /* ── theme tokens ──────────────────────────────────────────────── */
  const panelBg = isLight
    ? "bg-white border-[#dbe4ee] shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
    : "bg-[#0f172a] border-[#1e293b] shadow-[0_24px_60px_rgba(0,0,0,0.65)]";

  const nameTxt = isLight ? "text-slate-900" : "text-white";
  const emailTxt = isLight ? "text-slate-500" : "text-slate-500";

  const avatarBg = isLight
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-[#2563EB]/35 bg-[#1e3a8a]/25 text-sky-200";
  const onlineDot = isLight ? "border-white bg-emerald-500" : "border-[#0f172a] bg-emerald-400";

  const roleBadge = isLight
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-white/10 bg-sky-900/30 text-sky-300";
  const socBadge = isLight
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-white/10 bg-amber-900/25 text-amber-300";

  const sessionCard = isLight
    ? "border-blue-200 bg-blue-50/50"
    : "border-sky-500/20 bg-sky-500/[0.05]";
  const sessionLabel = isLight ? "text-slate-800" : "text-white";
  const sessionMeta = isLight ? "text-slate-500" : "text-slate-500";
  const sessionBadge = isLight
    ? "bg-blue-100 text-blue-700"
    : "bg-[#2563EB]/25 text-sky-200";
  const noSessionTxt = isLight ? "text-slate-400" : "text-slate-600";

  const recentCard = isLight
    ? "border-slate-200 bg-slate-50"
    : "border-white/[0.05] bg-white/[0.02]";
  const recentName = isLight ? "text-slate-700" : "text-slate-300";
  const recentLoc = isLight ? "text-slate-400" : "text-slate-600";

  const toggleBtn = isLight
    ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    : "border-white/10 bg-white/[0.05] text-slate-300 hover:border-sky-500/30 hover:bg-sky-500/[0.08] hover:text-white";

  const prefText = isLight ? "text-slate-600" : "text-slate-400";
  const editLink = isLight ? "text-blue-600 hover:text-blue-500" : "text-sky-500 hover:text-sky-300";

  const bottomLine = isLight
    ? "bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"
    : "bg-gradient-to-r from-transparent via-sky-500/20 to-transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`workspace-panel absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,360px)] overflow-hidden rounded-2xl border ${panelBg}`}
    >
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${avatarBg}`}
          >
            {getInitials(name)}
          </span>
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 ${onlineDot}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-semibold ${nameTxt}`}>{name}</p>
          <p className={`truncate text-[12px] ${emailTxt}`}>
            {sanitizePlainText(email, 200)}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleBadge}`}
            >
              {role}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${socBadge}`}
            >
              SOC · {soc}
            </span>
          </div>
        </div>
      </div>

      <Divider isLight={isLight} />

      {/* ── Quick actions ────────────────────────────────────────── */}
      <div className="p-2">
        <QuickAction
          icon={User}
          label="My Profile"
          isLight={isLight}
          onClick={() => go(role === "admin" ? "/admin/profile" : "/user/profile")}
        />
        <QuickAction
          icon={Shield}
          label="Security Overview"
          isLight={isLight}
          onClick={() => go(role === "admin" ? "/admin/settings" : "/user/security")}
        />
        <QuickAction
          icon={Settings}
          label="Settings"
          isLight={isLight}
          onClick={() => go(role === "admin" ? "/admin/settings" : "/user/settings")}
        />
      </div>

      <Divider isLight={isLight} />

      {/* ── Active session ───────────────────────────────────────── */}
      <div className="px-2 py-1">
        <SectionLabel isLight={isLight}>Active session</SectionLabel>
        {currentSession ? (
          <div className={`rounded-xl border px-3 py-2.5 ${sessionCard}`}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shrink-0" />
              <p className={`text-[13px] font-semibold ${sessionLabel}`}>
                {sanitizePlainText(currentSession.label, 60)}
              </p>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${sessionBadge}`}
              >
                CURRENT
              </span>
            </div>
            <p className={`mt-1 text-[11px] ${sessionMeta}`}>
              {sanitizePlainText(currentSession.location || "Unknown location", 60)} ·{" "}
              {sanitizePlainText(currentSession.ip || "", 40)}
            </p>
          </div>
        ) : (
          <p className={`px-3 pb-2 text-[12px] ${noSessionTxt}`}>
            No active session detected.
          </p>
        )}
        {recentSessions.length > 0 && (
          <div className="mt-2 space-y-1">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${recentCard}`}
              >
                <Activity
                  className={`h-3.5 w-3.5 shrink-0 ${isLight ? "text-slate-400" : "text-slate-600"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[12px] font-semibold ${recentName}`}>
                    {sanitizePlainText(s.label, 60)}
                  </p>
                  <p className={`text-[11px] ${recentLoc}`}>
                    {sanitizePlainText(s.location || "—", 50)}
                  </p>
                </div>
                {wc.canTerminateRemoteSessions ? (
                  <button
                    type="button"
                    disabled={wc.sessionActionId === s.id}
                    onClick={() => void wc.revokeSession(s.id)}
                    className={`shrink-0 rounded-lg border p-1.5 transition disabled:opacity-40 ${
                      isLight
                        ? "border-rose-200 text-rose-500 hover:bg-rose-50"
                        : "border-rose-500/25 text-rose-400 hover:bg-rose-500/10"
                    }`}
                    title="Terminate session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider isLight={isLight} />

      {/* ── Preferences ─────────────────────────────────────────── */}
      <div className="px-2 py-1">
        <SectionLabel isLight={isLight}>Preferences</SectionLabel>
        <div className="flex items-center justify-between px-3 py-2">
          <div className={`flex items-center gap-2 text-[13px] ${prefText}`}>
            {wc.isLight ? (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-sky-300" />
            )}
            {wc.isLight ? "Light mode" : "Dark mode"}
          </div>
          <button
            type="button"
            onClick={() => {
              wc.setTheme(wc.theme === "dark" ? "light" : "dark");
              wc.pushToast(
                `Switched to ${wc.theme === "dark" ? "light" : "dark"} mode.`,
                "success",
              );
            }}
            className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition ${toggleBtn}`}
          >
            {wc.isLight ? "Go dark" : "Go light"}
          </button>
        </div>
        <div className="flex items-center justify-between px-3 pb-2">
          <div className={`flex items-center gap-2 text-[13px] ${prefText}`}>
            <Globe2 className={`h-3.5 w-3.5 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
            {wc.preferences.language.toUpperCase()} ·{" "}
            {wc.preferences.timezone.split("/").pop()}
          </div>
          <button
            type="button"
            onClick={() => go(role === "admin" ? "/admin/settings" : "/user/settings")}
            className={`text-[12px] ${editLink}`}
          >
            Edit →
          </button>
        </div>
      </div>

      <Divider isLight={isLight} />

      {/* ── Workspace lock + logout ──────────────────────────────── */}
      <div className="p-2">
        <QuickAction
          icon={Lock}
          label="Lock workspace"
          tone="warning"
          isLight={isLight}
          onClick={() => {
            wc.lockWorkspace();
            onClose?.();
          }}
        />
        <QuickAction
          icon={LogOut}
          label="Log out"
          tone="danger"
          isLight={isLight}
          onClick={() => {
            onClose?.();
            wc.logoutAndRedirect();
          }}
        />
      </div>

      {/* bottom accent line */}
      <div className={`h-1 ${bottomLine}`} />
    </motion.div>
  );
});
