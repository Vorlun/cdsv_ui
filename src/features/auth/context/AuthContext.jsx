import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loginCredentials,
  registerUser,
  rotateRefreshTokens,
  writeProfileFullName,
} from "@/services/auth/authApi";
import { ApiError } from "@/services/api/apiError";
import {
  clearPersistedSession,
  readPersistedSession,
  writePersistedSession,
} from "@/utils/sessionAuthStorage";
import { normalizeEmail } from "@/utils/validation";
import { clearAccessToken, setAccessToken } from "@/utils/tokenMemory";

const AuthActionsContext = createContext(null);
const AuthSessionContext = createContext(null);

const LEGACY_KEYS = ["cdsv-auth", "cdsv-role"];

function scrubLegacyBrowserStorage() {
  try {
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* ignore quota / sandbox */
  }
}

function buildEnvelope({ refreshToken, rememberMe, user, role }) {
  return {
    version: 1,
    refreshToken,
    rememberMe: Boolean(rememberMe),
    user,
    role,
  };
}

/** @returns {(state: AuthSessionState | ((s: AuthSessionState) => AuthSessionState)) => void} */
function useAuthCoordinator() {
  const [hydrated, setHydrated] = useState(false);

  const [session, setSession] = useState({
    isAuthenticated: false,
    user: null,
    role: null,
    sessionExpiresAt: null,
    lastError: null,
  });

  const establishSession = useCallback((tokens, envelopeFields) => {
    setAccessToken(tokens.accessToken);
    writePersistedSession(
      buildEnvelope({
        refreshToken: tokens.refreshToken,
        rememberMe: envelopeFields.rememberMe ?? false,
        user: envelopeFields.user,
        role: envelopeFields.role,
      }),
    );
    setSession({
      isAuthenticated: true,
      user: envelopeFields.user,
      role: envelopeFields.role,
      sessionExpiresAt: tokens.expiresAt ?? null,
      lastError: null,
    });
  }, []);

  const teardownSession = useCallback(() => {
    clearAccessToken();
    clearPersistedSession();
    setSession({
      isAuthenticated: false,
      user: null,
      role: null,
      sessionExpiresAt: null,
      lastError: null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    /** Bootstrap: restore refresh from sessionStorage, mint new access token in-memory. */
    async function hydrate() {
      scrubLegacyBrowserStorage();
      const envelope = readPersistedSession();

      if (!envelope?.refreshToken) {
        if (!cancelled) {
          clearAccessToken();
          setHydrated(true);
        }
        return;
      }

      try {
        const next = await rotateRefreshTokens(envelope.refreshToken);
        if (cancelled) return;

        establishSession(next, {
          rememberMe: envelope.rememberMe,
          user: envelope.user,
          role: envelope.role,
        });
      } catch {
        teardownSession();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [establishSession, teardownSession]);

  const login = useCallback(
    async ({ email, password, rememberMe }) => {
      setSession((prev) => ({ ...prev, lastError: null }));
      try {
        const result = await loginCredentials({ email, password, rememberMe });
        establishSession(result, {
          rememberMe,
          user: result.user,
          role: result.role,
        });
        return { ok: true, role: result.role };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Unexpected authentication failure.";
        setSession((prev) => ({ ...prev, lastError: message }));
        return { ok: false, error: message };
      }
    },
    [establishSession],
  );

  const register = useCallback(async ({ email, fullName }) => {
    try {
      const created = await registerUser({ email, fullName });
      establishSession(created, {
        rememberMe: false,
        user: created.user,
        role: created.role ?? "user",
      });
      return { ok: true, role: created.role ?? "user" };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed.";
      return { ok: false, error: message };
    }
  }, [establishSession]);

  const updateSessionUser = useCallback((patch) => {
    const env = readPersistedSession();
    if (!env?.user?.email) return { ok: false, message: "No active envelope." };
    const emailNorm = normalizeEmail(env.user.email);
    if (Object.prototype.hasOwnProperty.call(patch, "fullName") && patch.fullName != null) {
      writeProfileFullName(emailNorm, String(patch.fullName));
    }
    const nextUser = { ...env.user, ...patch };
    writePersistedSession({
      ...env,
      user: nextUser,
    });
    setSession((prev) => (prev.isAuthenticated ? { ...prev, user: nextUser } : prev));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    teardownSession();
    scrubLegacyBrowserStorage();
  }, [teardownSession]);

  return { session, hydrated, login, register, logout, updateSessionUser };
}

export function AuthProvider({ children }) {
  const { session, hydrated, login, register, logout, updateSessionUser } = useAuthCoordinator();

  const sessionValue = useMemo(
    () => ({
      ...session,
      isHydrated: hydrated,
    }),
    [session, hydrated],
  );

  const actions = useMemo(
    () => ({
      login,
      register,
      logout,
      updateSessionUser,
    }),
    [login, register, logout, updateSessionUser],
  );

  return (
    <AuthSessionContext.Provider value={sessionValue}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error("useAuthSession must be used within AuthProvider");
  return ctx;
}

export function useAuthActions() {
  const ctx = useContext(AuthActionsContext);
  if (!ctx) throw new Error("useAuthActions must be used within AuthProvider");
  return ctx;
}

/** Backwards-compatible combined hook (prefer split hooks in hot paths if needed). */
export function useAuth() {
  const session = useAuthSession();
  const actions = useAuthActions();
  return useMemo(
    () => ({
      ...session,
      ...actions,
    }),
    [session, actions],
  );
}
