import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { verifyUserPassword } from "@/services/auth/authApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { normalizeSocError } from "@/services/apiErrorHandler";
import {
  createApiKey,
  getActiveApiKeys,
  getWorkspaceSessions,
  revokeApiKey,
  terminateWorkspaceSession,
} from "@/services/userWorkspaceStore";
import { sanitizePlainText } from "@/utils/sanitize";

const WorkspaceControlContext = createContext(null);

const THEME_KEY = "cdsv-theme";
const PREFS_KEY = "cdsv-workspace-prefs";
const LOCK_KEY = "cdsv-workspace-locked";

const DEFAULT_PREFS = Object.freeze({
  language: "en",
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  defaultRoute: "",
});

function readTheme() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...p };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function writePrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function readLocked() {
  try {
    return window.sessionStorage.getItem(LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function WorkspaceControlProvider({ children }) {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const email = user?.email ?? "";

  const [theme, setThemeState] = useState(() =>
    typeof window !== "undefined" ? readTheme() : "dark",
  );
  const [preferences, setPreferences] = useState(() =>
    typeof window !== "undefined" ? readPrefs() : { ...DEFAULT_PREFS },
  );
  const [workspaceLocked, setWorkspaceLocked] = useState(() =>
    typeof window !== "undefined" ? readLocked() : false,
  );
  const [toasts, setToasts] = useState(() => []);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [sessionActionId, setSessionActionId] = useState("");
  const [keyActionId, setKeyActionId] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [lastGeneratedSecret, setLastGeneratedSecret] = useState(null);

  const pushToast = useCallback((message, tone = "info") => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message: sanitizePlainText(message, 360), tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isLight = theme === "light";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.style.background = theme === "light" ? "#f1f5f9" : "#0b0f1a";
    document.body.style.color = theme === "light" ? "#0f172a" : "#e5e7eb";
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = preferences.language || "en";
  }, [preferences.language]);

  const setTheme = useCallback((next) => {
    setThemeState(next === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      return next;
    });
  }, []);

  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const lockWorkspace = useCallback(() => {
    try {
      window.sessionStorage.setItem(LOCK_KEY, "1");
    } catch {
      /* ignore */
    }
    setWorkspaceLocked(true);
    pushToast("Workspace locked — enter your password to continue.", "warning");
  }, [pushToast]);

  const unlockWorkspace = useCallback(
    async (password) => {
      if (!email) {
        pushToast("No active principal for unlock.", "error");
        return { ok: false };
      }
      setUnlockBusy(true);
      try {
        await verifyUserPassword(email, password);
        try {
          window.sessionStorage.removeItem(LOCK_KEY);
        } catch {
          /* ignore */
        }
        setWorkspaceLocked(false);
        pushToast("Workspace unlocked.", "success");
        return { ok: true };
      } catch (err) {
        pushToast(normalizeSocError(err).message ?? "Unlock failed.", "error");
        return { ok: false };
      } finally {
        setUnlockBusy(false);
      }
    },
    [email, pushToast],
  );

  const reloadSessions = useCallback(async () => {
    if (!email) return;
    setSessionsLoading(true);
    await new Promise((r) => window.setTimeout(r, 320));
    try {
      setSessions(getWorkspaceSessions(email));
    } finally {
      setSessionsLoading(false);
    }
  }, [email]);

  const reloadApiKeys = useCallback(async () => {
    if (!email) return;
    setKeysLoading(true);
    await new Promise((r) => window.setTimeout(r, 280));
    try {
      setApiKeys(getActiveApiKeys(email));
    } finally {
      setKeysLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void reloadSessions();
    void reloadApiKeys();
  }, [email, reloadSessions, reloadApiKeys]);

  const revokeSession = useCallback(
    async (sessionId) => {
      if (!email) return { ok: false };
      setSessionActionId(String(sessionId));
      await new Promise((r) => window.setTimeout(r, 200));
      try {
        const res = terminateWorkspaceSession(email, sessionId);
        if (res.ok) {
          setSessions(res.sessions);
          pushToast("Remote session terminated.", "success");
          return { ok: true };
        }
        pushToast(res.message ?? "Terminate failed.", "error");
        return { ok: false };
      } finally {
        setSessionActionId("");
      }
    },
    [email, pushToast],
  );

  const generateApiKey = useCallback(
    async (label) => {
      if (!email || !role) return { ok: false };
      if (role !== "admin") {
        pushToast("API keys can only be created by administrators.", "error");
        return { ok: false };
      }
      setKeyActionId("gen");
      await new Promise((r) => window.setTimeout(r, 240));
      try {
        const res = createApiKey(email, label, "admin");
        if (res.ok) {
          setApiKeys(getActiveApiKeys(email));
          setLastGeneratedSecret({ id: res.record.id, plainText: res.plainTextSecret, label: res.record.label });
          pushToast("API key created.", "success");
          return { ok: true };
        }
        pushToast(res.message ?? "Key generation declined.", "error");
        return { ok: false };
      } finally {
        setKeyActionId("");
      }
    },
    [email, role, pushToast],
  );

  const revokeKey = useCallback(
    async (keyId) => {
      if (!email) return { ok: false };
      if (role !== "admin") {
        pushToast("API keys can only be revoked by administrators.", "error");
        return { ok: false };
      }
      setKeyActionId(String(keyId));
      await new Promise((r) => window.setTimeout(r, 200));
      try {
        revokeApiKey(email, keyId);
        setApiKeys(getActiveApiKeys(email));
        pushToast("API key revoked.", "success");
        return { ok: true };
      } finally {
        setKeyActionId("");
      }
    },
    [email, pushToast, role],
  );

  const clearRevealedSecret = useCallback(() => setLastGeneratedSecret(null), []);

  const logoutAndRedirect = useCallback(() => {
    try {
      window.sessionStorage.removeItem(LOCK_KEY);
    } catch {
      /* ignore */
    }
    setWorkspaceLocked(false);
    logout();
    navigate("/login", { replace: true });
    pushToast("Signed out securely.", "success");
  }, [logout, navigate, pushToast]);

  const value = useMemo(
    () => ({
      theme,
      isLight,
      setTheme,
      toggleTheme,
      preferences,
      updatePreferences,
      workspaceLocked,
      lockWorkspace,
      unlockWorkspace,
      unlockBusy,
      toasts,
      pushToast,
      dismissToast,
      sessions,
      sessionsLoading,
      reloadSessions,
      revokeSession,
      sessionActionId,
      apiKeys,
      keysLoading,
      reloadApiKeys,
      generateApiKey,
      revokeKey,
      keyActionId,
      lastGeneratedSecret,
      clearRevealedSecret,
      logoutAndRedirect,
      rbacRole: role,
      canManageApiKeys: role === "admin",
      canTerminateRemoteSessions: Boolean(role) && user?.socRole !== "Viewer",
    }),
    [
      theme,
      isLight,
      setTheme,
      toggleTheme,
      preferences,
      updatePreferences,
      workspaceLocked,
      lockWorkspace,
      unlockWorkspace,
      unlockBusy,
      toasts,
      pushToast,
      dismissToast,
      sessions,
      sessionsLoading,
      reloadSessions,
      revokeSession,
      sessionActionId,
      apiKeys,
      keysLoading,
      reloadApiKeys,
      generateApiKey,
      revokeKey,
      keyActionId,
      lastGeneratedSecret,
      clearRevealedSecret,
      logoutAndRedirect,
      role,
      user,
    ],
  );

  return (
    <WorkspaceControlContext.Provider value={value}>{children}</WorkspaceControlContext.Provider>
  );
}

export function useWorkspaceControl() {
  const ctx = useContext(WorkspaceControlContext);
  if (!ctx) throw new Error("useWorkspaceControl requires WorkspaceControlProvider.");
  return ctx;
}
