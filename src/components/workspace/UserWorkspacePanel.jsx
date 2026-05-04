import { Children, cloneElement, isValidElement, memo, useState } from "react";
import {
  Activity,
  ClipboardCopy,
  Cpu,
  Globe2,
  Languages,
  Loader2,
  LogOut,
  MapPin,
  Moon,
  Shield,
  ShieldAlert,
  Sun,
  Timer,
  Trash2,
  KeyRound,
  RefreshCw,
  UserCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { sanitizePlainText } from "@/utils/sanitize";
import { normalizeSocRole } from "@/utils/socPermissions";

function Tt({ label, children }) {
  const only = Children.only(children);
  if (!isValidElement(only)) return only;
  const prev = only.props.title;
  return cloneElement(only, {
    title: prev ? `${prev} · ${label}` : label,
  });
}

const LANGS = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const ZONES = ["UTC", "Europe/London", "Europe/Berlin", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Singapore"];

const DEFAULT_ADMIN_ROUTES = [
  { value: "/admin/dashboard", label: "SOC dashboard" },
  { value: "/admin/threats", label: "Threat command" },
  { value: "/admin/logs", label: "Audit center" },
  { value: "/admin/users", label: "Directory" },
];

const DEFAULT_USER_ROUTES = [
  { value: "/user/dashboard", label: "Overview" },
  { value: "/user/upload", label: "Upload" },
  { value: "/user/security", label: "Security" },
  { value: "/user/files", label: "Files" },
];

export default memo(function UserWorkspacePanel({ user, role, onClose }) {
  const navigate = useNavigate();
  const wc = useWorkspaceControl();
  const [keyLabelDraft, setKeyLabelDraft] = useState("SOC automation");

  const email = user?.email ?? "";
  const name = user?.fullName ?? user?.name ?? "Operator";
  const soc = user?.socRole ?? "—";
  const isSocViewer = normalizeSocRole(user?.socRole) === "Viewer";

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const copyText = async (text, okMsg) => {
    const t = String(text ?? "");
    try {
      await navigator.clipboard.writeText(t);
      wc.pushToast(okMsg ?? "Copied to clipboard.", "success");
    } catch {
      wc.pushToast("Clipboard unavailable in this context.", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="workspace-panel absolute right-0 z-40 mt-2 max-h-[calc(100vh-100px)] w-[min(100vw-1.5rem,420px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0F172A]/95 p-3 shadow-[0_20px_50px_rgba(2,6,23,0.5)] backdrop-blur-xl"
    >
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/15 text-base font-semibold text-[#BFDBFE]">
            {sanitizePlainText(name.slice(0, 2), 4).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{sanitizePlainText(name, 120)}</div>
            <div className="truncate text-xs text-[#9CA3AF]">{sanitizePlainText(email, 200)}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-[#64748B]">
              <span className="rounded border border-white/10 bg-[#0B1220] px-1.5 py-0.5 text-[#93C5FD]">App · {role}</span>
              <span className="rounded border border-white/10 bg-[#0B1220] px-1.5 py-0.5 text-[#FDE68A]">SOC · {soc}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
          <div className="rounded-md bg-[#0B1220] px-2 py-1.5 text-[#94A3B8]">
            Language
            <br />
            <span className="text-[#E5E7EB]">{wc.preferences.language.toUpperCase()}</span>
          </div>
          <div className="rounded-md bg-[#0B1220] px-2 py-1.5 text-[#94A3B8]">
            Timezone
            <br />
            <span className="truncate text-[#E5E7EB]">{wc.preferences.timezone}</span>
          </div>
          <div className="rounded-md bg-[#0B1220] px-2 py-1.5 text-[#94A3B8]">
            Theme
            <br />
            <span className="text-[#E5E7EB]">{wc.theme}</span>
          </div>
        </div>
      </div>

      {/* Theme */}
      <section className="mb-3 rounded-xl border border-white/10 bg-[#0B1220]/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            {wc.isLight ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-sky-300" />}
            Appearance
          </div>
          <Tt label="Persisted in local storage and applied immediately across the workspace shell.">
            <button
              type="button"
              onClick={() => {
                const next = wc.theme === "dark" ? "light" : "dark";
                wc.setTheme(next);
                wc.pushToast(`Appearance saved · ${next} mode active`, "success");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/15 px-3 py-1.5 text-xs font-medium text-[#BFDBFE] transition hover:bg-[#3B82F6]/25"
            >
              {wc.isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Use {wc.isLight ? "dark" : "light"} mode
            </button>
          </Tt>
        </div>
        <p className="text-[11px] text-[#64748B]">
          Console chrome, navigation, and backgrounds follow the selected density. Preference is stored on this device only.
        </p>
      </section>

      {/* Lock */}
      <section className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/05 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#FDE68A]">Workspace lock</div>
            <p className="text-[11px] text-[#A8A29E]">Instant privacy blur — unlock with your account password.</p>
          </div>
          <Tt label="Obscures the workspace with a glass overlay. Your session remains authenticated until logout.">
            <button
              type="button"
              onClick={() => {
                wc.lockWorkspace();
                onClose?.();
              }}
              className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-[#FEF3C7] transition hover:bg-amber-500/25"
            >
              Lock now
            </button>
          </Tt>
        </div>
      </section>

      {/* Quick nav — RBAC */}
      <section className="mb-3 space-y-1">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Workspace</p>
        <Tt label="Opens the directory profile view for your tenant persona.">
          <button
            type="button"
            onClick={() => go(role === "admin" ? "/admin/profile" : "/user/profile")}
            className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15"
          >
            <UserCircle2 className="h-4 w-4 text-[#93C5FD]" />
            My profile
          </button>
        </Tt>
        {role === "admin" ? (
          <>
            <Tt label="SOC threat operations — requires admin application role.">
              <button
                type="button"
                onClick={() => go("/admin/threats")}
                className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15"
              >
                <ShieldAlert className="h-4 w-4 text-[#FDBA74]" />
                Threat command
              </button>
            </Tt>
            <Tt label="Security Control Center governance plane.">
              <button
                type="button"
                onClick={() => go("/admin/settings")}
                className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15"
              >
                <Shield className="h-4 w-4 text-[#6EE7B7]" />
                Security settings
              </button>
            </Tt>
          </>
        ) : (
          <Tt label="Subscriber security posture and guidance.">
            <button
              type="button"
              onClick={() => go("/user/security")}
              className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#E5E7EB] transition hover:bg-[#3B82F6]/15"
            >
              <ShieldAlert className="h-4 w-4 text-[#FDBA74]" />
              Security overview
            </button>
          </Tt>
        )}
      </section>

      {/* Sessions */}
      <section className="mb-3 rounded-xl border border-white/10 bg-[#0B1220]/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            <Activity className="h-4 w-4 text-[#6EE7B7]" /> Active sessions
          </span>
          <Tt label="Re-fetch the mocked session ledger from browser storage.">
            <button
              type="button"
              disabled={wc.sessionsLoading}
              onClick={() => void wc.reloadSessions()}
              className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] text-[#93C5FD] hover:bg-white/10 disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${wc.sessionsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </Tt>
        </div>
        {wc.sessionsLoading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-[#64748B]">
            <Loader2 className="h-4 w-4 animate-spin text-[#38BDF8]" aria-hidden /> Loading sessions…
          </div>
        ) : (
          <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {wc.sessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-white/5 bg-[#0F172A]/90 px-2 py-2 text-[11px] text-[#D1D5DB]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-[#F8FAFC]">{sanitizePlainText(s.label, 80)}</span>
                    {s.current ? (
                      <span className="ml-2 rounded bg-[#2563EB]/25 px-1 py-px text-[9px] font-semibold uppercase text-[#BFDBFE]">
                        This device
                      </span>
                    ) : null}
                    <div className="mt-1 text-[10px] text-[#64748B]">{sanitizePlainText(s.location, 100)} · {sanitizePlainText(s.ip, 45)}</div>
                    <div className="text-[10px] text-[#475569]">{sanitizePlainText(s.deviceHint, 120)}</div>
                  </div>
                  {!s.current && wc.canTerminateRemoteSessions ? (
                    <Tt label="Ends the mocked remote session fingerprint for this workstation record.">
                      <button
                        type="button"
                        disabled={wc.sessionActionId === s.id}
                        onClick={() => void wc.revokeSession(s.id)}
                        className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-[#FECACA] hover:bg-red-500/20 disabled:opacity-40"
                      >
                        {wc.sessionActionId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </Tt>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!wc.canTerminateRemoteSessions ? (
          <p className="text-[10px] text-amber-200/85">SOC Viewer — observe-only ledger; revocation is gated.</p>
        ) : null}
      </section>

      {/* API keys */}
      {wc.canManageApiKeys ? (
        <section className="mb-3 rounded-xl border border-white/10 bg-[#0B1220]/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            <KeyRound className="h-4 w-4 text-[#BFDBFE]" /> API keys · mock store
          </div>
          <div className="mb-3 flex gap-2">
            <input
              value={keyLabelDraft}
              onChange={(e) => setKeyLabelDraft(sanitizePlainText(e.target.value, 80))}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#38BDF8]/50"
              placeholder="Key label"
            />
            <Tt label="Administrator-only · local mock envelope (max 12 active keys).">
              <button
                type="button"
                disabled={wc.keyActionId === "gen"}
                onClick={() => void wc.generateApiKey(keyLabelDraft)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
              >
                {wc.keyActionId === "gen" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                Generate
              </button>
            </Tt>
          </div>

          {wc.lastGeneratedSecret ? (
            <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-100">Copy once · server will not replay</p>
              <div className="mt-2 break-all font-mono text-[11px] text-amber-50">{wc.lastGeneratedSecret.plainText}</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyText(wc.lastGeneratedSecret.plainText, "API secret copied.")
                  }
                  className="inline-flex items-center gap-1 rounded bg-amber-500/25 px-2 py-1 text-[11px] text-amber-50"
                >
                  <ClipboardCopy className="h-3 w-3" /> Copy
                </button>
                <button type="button" onClick={() => wc.clearRevealedSecret()} className="text-[11px] text-amber-200/80 underline">
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          <div className="max-h-32 space-y-1.5 overflow-y-auto">
            {wc.keysLoading ? (
              <div className="flex items-center gap-2 py-4 text-[11px] text-[#64748B]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" /> Loading keys…
              </div>
            ) : wc.apiKeys.length === 0 ? (
              <p className="text-[11px] text-[#64748B]">No keys yet · generate one to enable northbound mocks.</p>
            ) : (
              wc.apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded border border-white/5 bg-[#0F172A]/80 px-2 py-1.5 text-[11px]">
                  <div className="min-w-0">
                    <span className="truncate font-medium text-[#E5E7EB]">{sanitizePlainText(k.label, 80)}</span>
                    <div className="font-mono text-[10px] text-[#64748B]">{k.secretRedacted}</div>
                  </div>
                  {!k.revoked ? (
                    <button
                      type="button"
                      disabled={wc.keyActionId === k.id}
                      onClick={() => void wc.revokeKey(k.id)}
                      className="shrink-0 rounded border border-red-500/30 px-2 py-0.5 text-[10px] text-red-100 hover:bg-red-500/20 disabled:opacity-40"
                    >
                      {wc.keyActionId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
                    </button>
                  ) : (
                    <span className="text-[9px] uppercase text-[#475569]">Revoked</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        <p className="mb-3 px-1 text-[11px] text-amber-200/90">
          {isSocViewer
            ? "SOC Viewer posture — outbound API interchange keys cannot be negotiated from this workstation."
            : "Administrator application role required to mint or revoke SOC API interchange keys."}
        </p>
      )}

      {/* Preferences */}
      <section className="mb-3 rounded-xl border border-white/10 bg-[#0B1220]/60 p-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          <Globe2 className="h-4 w-4" /> Preferences
        </div>
        <label className="mb-3 block">
          <span className="mb-1 flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Languages className="h-3 w-3" /> Language · html lang
          </span>
          <select
            value={wc.preferences.language}
            onChange={(e) => {
              wc.updatePreferences({ language: e.target.value });
              wc.pushToast(`Locale set to ${e.target.value}`, "success");
            }}
            className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-xs text-white"
          >
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3 block">
          <span className="mb-1 flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <Timer className="h-3 w-3" /> Timezone
          </span>
          <select
            value={wc.preferences.timezone}
            onChange={(e) => {
              wc.updatePreferences({ timezone: e.target.value });
              wc.pushToast(`Timezone baseline: ${e.target.value}`, "success");
            }}
            className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-xs text-white"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3 block">
          <span className="mb-1 flex items-center gap-1 text-[10px] text-[#94A3B8]">
            <MapPin className="h-3 w-3" /> Default route after preference change
          </span>
          <select
            value={wc.preferences.defaultRoute || (role === "admin" ? "/admin/dashboard" : "/user/dashboard")}
            onChange={(e) => {
              wc.updatePreferences({ defaultRoute: e.target.value });
              wc.pushToast("Default landing route saved locally.", "success");
            }}
            className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1.5 text-xs text-white"
          >
            {(role === "admin" ? DEFAULT_ADMIN_ROUTES : DEFAULT_USER_ROUTES).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} · {r.value}
              </option>
            ))}
          </select>
        </label>
        <Tt label="Immediately navigates using the saved default path — validates role prefix lightly.">
          <button
            type="button"
            onClick={() => {
              const base = wc.preferences.defaultRoute || (role === "admin" ? "/admin/dashboard" : "/user/dashboard");
              wc.updatePreferences({ defaultRoute: base });
              navigate(base);
              wc.pushToast(`Opened ${base}`, "success");
              onClose?.();
            }}
            className="w-full rounded-lg border border-[#38BDF8]/35 bg-[#38BDF8]/15 py-2 text-xs font-medium text-[#BAE6FD] hover:bg-[#38BDF8]/25"
          >
            Open saved default route now
          </button>
        </Tt>
      </section>

      <div className="border-t border-white/10 pt-2">
        <Tt label="Ends the refresh credential pair and clears in-memory bearer state.">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              wc.logoutAndRedirect();
            }}
            className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#FCA5A5] transition hover:bg-[#EF4444]/15"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </Tt>
      </div>
    </motion.div>
  );
});
