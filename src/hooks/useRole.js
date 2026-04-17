import { useMemo } from "react";

const allowedRoles = ["admin", "user"];

export default function useRole() {
  const role = useMemo(() => {
    if (typeof window === "undefined") {
      return "admin";
    }

    const storedRole = window.localStorage.getItem("cdsv-role")?.toLowerCase();
    if (storedRole && allowedRoles.includes(storedRole)) {
      return storedRole;
    }

    return "admin";
  }, []);

  return role;
}
