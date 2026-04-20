import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "../layouts/AdminLayout";
import UserLayout from "../layouts/UserLayout";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("../pages/admin/AdminUsersPage"));
const AdminLogsPage = lazy(() => import("../pages/admin/AdminLogsPage"));
const AdminThreatsPage = lazy(() => import("../pages/admin/AdminThreatsPage"));
const AdminUploadActivityPage = lazy(() => import("../pages/admin/AdminUploadActivityPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const UserDashboardPage = lazy(() => import("../pages/user/UserDashboardPage"));
const UserUploadPage = lazy(() => import("../pages/user/UserUploadPage"));
const UserFilesPage = lazy(() => import("../pages/user/UserFilesPage"));
const UserSecurityPage = lazy(() => import("../pages/user/UserSecurityPage"));
const UserProfilePage = lazy(() => import("../pages/user/UserProfilePage"));
const UserSettingsPage = lazy(() => import("../pages/user/UserSettingsPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#9CA3AF]">
      Loading page...
    </div>
  );
}

export default function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  const homePath = role === "admin" ? "/admin/dashboard" : "/user/dashboard";

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? homePath : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/admin"
          element={
            isAuthenticated ? (
              role === "admin" ? (
                <AdminLayout />
              ) : (
                <Navigate to="/user/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="threats" element={<AdminThreatsPage />} />
          <Route path="uploads" element={<AdminUploadActivityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route
          path="/user"
          element={
            isAuthenticated ? (
              role === "user" ? (
                <UserLayout />
              ) : (
                <Navigate to="/admin/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
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
}
