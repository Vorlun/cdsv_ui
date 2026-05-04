import { useMemo } from "react";
import { useAuthSession } from "@/features/auth/context/AuthContext";

/** @typedef {"admin"|"user"} Role */

/**
 * Sidebar/navigation persona for layouts that operate outside guarded routes.
 * Unauthenticated callers default to the least-privileged UI surface (`user`).
 * @returns {Role}
 */
export default function useRole() {
  const { isAuthenticated, role } = useAuthSession();

  return useMemo(() => {
    if (isAuthenticated && (role === "admin" || role === "user")) {
      return role;
    }
    return "user";
  }, [isAuthenticated, role]);
}
