import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar, { readInitialCollapsed } from "@/components/AppSidebar";
import AppTopbar from "@/components/AppTopbar";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { USER_NAV_SECTIONS, resolvePageTitle } from "@/config/navigation";

export default function UserLayout() {
  const { isLight } = useWorkspaceControl();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? readInitialCollapsed("user") : false,
  );
  const location = useLocation();
  const title = useMemo(() => resolvePageTitle(location.pathname, "user"), [location.pathname]);
  const mainGutter = sidebarCollapsed ? "lg:ml-[4.5rem]" : "lg:ml-64";

  return (
    <div
      className={`workspace-shell h-screen overflow-hidden transition-colors duration-200 ${
        isLight ? "bg-slate-100 text-slate-900" : "bg-[#0B0F1A] text-[#E5E7EB]"
      }`}
    >
      <AppSidebar
        persistNamespace="user"
        title="CDSV User"
        subtitle="Secure Workspace"
        sections={USER_NAV_SECTIONS}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
        isLight={isLight}
      />
      <div className={["ml-0 flex h-screen flex-col transition-[margin] duration-200 ease-out", mainGutter].join(" ")}>
        <AppTopbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto pt-[72px] outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/40"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
