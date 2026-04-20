import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  ShieldAlert,
  UploadCloud,
  Settings,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import AppTopbar from "../components/AppTopbar";

const sections = [
  {
    title: "Admin",
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Logs", path: "/admin/logs", icon: ScrollText },
      { label: "Threat Monitor", path: "/admin/threats", icon: ShieldAlert },
      { label: "Upload Activity", path: "/admin/uploads", icon: UploadCloud },
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = useMemo(() => {
    const found = sections[0].items.find((item) => item.path === location.pathname);
    return found?.label || "Admin Panel";
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#0B0F1A] text-[#E5E7EB]">
      <AppSidebar
        title="CDSV Admin"
        subtitle="Threat Operations"
        sections={sections}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
      <div className="ml-0 flex h-screen flex-col lg:ml-64">
        <AppTopbar title={title} onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto pt-[72px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
