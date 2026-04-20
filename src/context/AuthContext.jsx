import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authenticateStaticUser } from "../services/authService";

const AuthContext = createContext(null);

const STORAGE_KEY = "cdsv-auth";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    if (typeof window === "undefined") {
      return { isAuthenticated: false, user: null, role: "user" };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw
        ? JSON.parse(raw)
        : { isAuthenticated: false, user: null, role: "user" };
    } catch {
      return { isAuthenticated: false, user: null, role: "user" };
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    if (auth.role) {
      window.localStorage.setItem("cdsv-role", auth.role);
    }
  }, [auth]);

  const value = useMemo(
    () => ({
      ...auth,
      login: async ({ email, password }) => {
        const result = await authenticateStaticUser(email, password);
        if (!result) {
          return { ok: false, error: "Invalid credentials. Use admin@test.com or user@test.com." };
        }
        setAuth({
          isAuthenticated: true,
          role: result.role,
          user: {
            email: result.email,
            fullName: result.fullName,
            lastLogin: new Date().toISOString(),
          },
        });
        return { ok: true, role: result.role };
      },
      register: ({ email, fullName }) =>
        setAuth({
          isAuthenticated: true,
          role: "user",
          user: {
            email,
            fullName,
            lastLogin: new Date().toISOString(),
          },
        }),
      logout: () =>
        setAuth({
          isAuthenticated: false,
          role: "user",
          user: null,
        }),
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
