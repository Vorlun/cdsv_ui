import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

const allowedRoles = ["admin", "user"];

export default function useRole() {
  const auth = useAuth();
  const role = useMemo(() => {
    if (auth?.isAuthenticated && auth.role) {
      return auth.role;
    }
    if (typeof window === "undefined") {
      return "admin";
    }

    const storedRole = window.localStorage.getItem("cdsv-role")?.toLowerCase();
    if (storedRole && allowedRoles.includes(storedRole)) {
      return storedRole;
    }

    return "admin";
  }, [auth?.isAuthenticated, auth?.role]);

  return role;
}
