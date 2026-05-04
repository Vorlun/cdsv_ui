import { Suspense, lazy, memo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthSession } from "@/features/auth/context/AuthContext";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import AdminLayout from "@/layouts/AdminLayout";
import UserLayout from "@/layouts/UserLayout";
import { PageSpinner } from "@/components/feedback/PageSpinner";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminLogsPage = lazy(() => import("@/pages/admin/AdminLogsPage"));
const AdminThreatsPage = lazy(() => import("@/pages/admin/AdminThreatsPage"));
const AdminUploadActivityPage = lazy(() => import("@/pages/admin/AdminUploadActivityPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const UserDashboardPage = lazy(() => import("@/pages/user/UserDashboardPage"));
const UserUploadPage = lazy(() => import("@/pages/user/UserUploadPage"));
const UserFilesPage = lazy(() => import("@/pages/user/UserFilesPage"));
const UserSecurityPage = lazy(() => import("@/pages/user/UserSecurityPage"));
const UserProfilePage = lazy(() => import("@/pages/user/UserProfilePage"));
const UserSettingsPage = lazy(() => import("@/pages/user/UserSettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const RouteFallback = memo(function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#0B0F1A] text-[#94A3B8]"
      role="status"
      aria-live="polite"
    >
      <PageSpinner label="Loading page" />
    </div>
  );
});

export default memo(function AppRoutes() {
  const { isHydrated, isAuthenticated, role } = useAuthSession();
  const homePath = role === "admin" ? "/admin/dashboard" : "/user/dashboard";

  if (!isHydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0B0F1A]"
        role="status"
        aria-busy="true"
        aria-label="Restoring session"
      >
        <PageSpinner label="Restoring secure session" />
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? homePath : "/login"} replace />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/upload" element={<Navigate to="/user/upload" replace />} />
        <Route path="/files" element={<Navigate to="/user/files" replace />} />
        <Route path="/security" element={<Navigate to="/user/security" replace />} />

        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={["admin"]}>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="threats" element={<AdminThreatsPage />} />
          <Route path="uploads" element={<AdminUploadActivityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        <Route
          path="/user"
          element={
            <RequireAuth allowedRoles={["user"]}>
              <UserLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="upload" element={<UserUploadPage />} />
          <Route path="files" element={<UserFilesPage />} />
          <Route path="security" element={<UserSecurityPage />} />
          <Route path="profile" element={<UserProfilePage />} />
          <Route path="settings" element={<UserSettingsPage />} />
        </Route>

        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
    </Suspense>
  );
});
