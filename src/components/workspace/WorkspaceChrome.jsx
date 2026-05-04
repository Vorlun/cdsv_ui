import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Lock, X } from "lucide-react";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";

export function WorkspaceToastStack() {
  const { toasts, dismissToast } = useWorkspaceControl();
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100001] flex max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            role="status"
            className={`pointer-events-auto rounded-xl border px-3 py-2.5 text-sm shadow-lg backdrop-blur-xl ${
              t.tone === "success"
                ? "border-emerald-500/35 bg-emerald-950/90 text-emerald-50"
                : t.tone === "error"
                  ? "border-red-500/35 bg-red-950/90 text-red-50"
                  : t.tone === "warning"
                    ? "border-amber-500/35 bg-amber-950/90 text-amber-50"
                    : "border-[#3B82F6]/30 bg-[#0F172A]/95 text-[#E5E7EB]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span>{t.message}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismissToast(t.id)}
                className="rounded p-0.5 text-current opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export default function WorkspaceShellOverlays() {
  return (
    <>
      <WorkspaceToastStack />
      <WorkspaceLockOverlay />
    </>
  );
}

export function WorkspaceLockOverlay() {
  const { workspaceLocked, unlockWorkspace, unlockBusy } = useWorkspaceControl();
  const [password, setPassword] = useState("");

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const pwd = password;
      const res = await unlockWorkspace(pwd);
      if (res.ok) setPassword("");
    },
    [password, unlockWorkspace],
  );

  if (!workspaceLocked || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/55 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-lock-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0F172A]/95 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3B82F6]/20 ring-2 ring-[#38BDF8]/40">
            <Lock className="h-6 w-6 text-[#BFDBFE]" aria-hidden />
          </span>
          <h2 id="workspace-lock-title" className="text-lg font-semibold text-white">
            Workspace locked
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Session stays signed in · re-enter your account password to dismiss the privacy screen.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value.slice(0, 128))}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/60"
          />
          <button
            type="submit"
            disabled={unlockBusy || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {unlockBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Unlock workspace
          </button>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
