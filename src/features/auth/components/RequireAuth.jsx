import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { PageSpinner } from "@/components/feedback/PageSpinner";

/**
 * Guards routes that demand an authenticated principal.
 * @param {{
 *   children: import('react').ReactNode;
 *   allowedRoles?: readonly ("admin"|"user")[];
 * }} props
 */
export function RequireAuth({ children, allowedRoles }) {
  const { isHydrated, isAuthenticated, role } = useAuthSession();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A]" role="status" aria-live="polite">
        <PageSpinner label="Initializing secure session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    const fallback = role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
