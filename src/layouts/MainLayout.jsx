import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopNavbar from "../components/TopNavbar";
import useRole from "../hooks/useRole";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = useRole();

  return (
    <div className="h-screen overflow-hidden bg-[#0B0F1A] text-[#E5E7EB]">
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="ml-0 flex h-screen min-w-0 flex-1 flex-col lg:ml-60">
        <TopNavbar role={role} onMenuClick={() => setSidebarOpen(true)} />
        <main className="h-full flex-1 overflow-y-auto pt-[73px]">
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
