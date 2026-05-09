import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar, { readInitialCollapsed } from "@/components/AppSidebar";
import AppTopbar from "@/components/AppTopbar";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import { ADMIN_NAV_SECTIONS, resolvePageTitle } from "@/config/navigation";

export default function AdminLayout() {
  const { isLight } = useWorkspaceControl();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? readInitialCollapsed("admin") : false,
  );
  const location = useLocation();
  const title = useMemo(() => resolvePageTitle(location.pathname, "admin"), [location.pathname]);
  const mainGutter = sidebarCollapsed ? "lg:ml-[4.5rem]" : "lg:ml-64";

  return (
    /* Admin console is always rendered in dark mode — intentional SOC terminal design.
       User light/dark preference applies to the user workspace only. */
    <div className="workspace-shell admin-dark-scope h-screen overflow-hidden bg-[#080C14] text-[#E5E7EB]">
      <AppSidebar
        persistNamespace="admin"
        title="CDSV Admin"
        subtitle="ENTERPRISE SECURITY CENTER"
        sections={ADMIN_NAV_SECTIONS}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
        isLight={false}
      />
      <div className={["ml-0 flex h-screen flex-col transition-[margin] duration-200 ease-out", mainGutter].join(" ")}>
        <AppTopbar title={title} onMenuClick={() => setMobileOpen(true)} forceDark />
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
