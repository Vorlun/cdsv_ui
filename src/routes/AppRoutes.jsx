import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const UploadPage = lazy(() => import("../pages/UploadPage"));
const SecurityPage = lazy(() => import("../pages/SecurityPage"));
const AttackPage = lazy(() => import("../pages/AttackPage"));
const AIPage = lazy(() => import("../pages/AIPage"));
const LogsPage = lazy(() => import("../pages/LogsPage"));
const LogDetailPage = lazy(() => import("../pages/LogDetailPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const MyFilesPage = lazy(() => import("../pages/MyFilesPage"));
const SecurityStatusPage = lazy(() => import("../pages/SecurityStatusPage"));
const ProfileSettingsPage = lazy(() => import("../pages/ProfileSettingsPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#9CA3AF]">
      Loading page...
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/attack" element={<AttackPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/my-files" element={<MyFilesPage />} />
          <Route path="/security-status" element={<SecurityStatusPage />} />
          <Route path="/profile-settings" element={<ProfileSettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
