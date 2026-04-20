import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  FolderKanban,
  ShieldCheck,
  UserCircle2,
  Settings,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import AppTopbar from "../components/AppTopbar";

const sections = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
      { label: "Upload File", path: "/user/upload", icon: UploadCloud },
      { label: "My Files", path: "/user/files", icon: FolderKanban },
      { label: "Security Status", path: "/user/security", icon: ShieldCheck },
      { label: "Profile", path: "/user/profile", icon: UserCircle2 },
      { label: "Settings", path: "/user/settings", icon: Settings },
    ],
  },
];

export default function UserLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = useMemo(() => {
    const found = sections[0].items.find((item) => item.path === location.pathname);
    return found?.label || "User Workspace";
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#0B0F1A] text-[#E5E7EB]">
      <AppSidebar
        title="CDSV User"
        subtitle="Secure Workspace"
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
