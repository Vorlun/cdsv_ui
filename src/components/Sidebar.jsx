import {
  Activity,
  Brain,
  LayoutDashboard,
  Lock,
  Network,
  ShieldCheck,
  ScrollText,
  Settings,
  Shield,
  Skull,
  Upload,
  UserCircle2,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const adminSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Upload", path: "/upload", icon: Upload },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Security Visualizer", path: "/security", icon: Network },
      { label: "AI Analysis", path: "/ai", icon: Brain },
    ],
  },
  {
    title: "Admin Tools",
    items: [
      { label: "Attack Simulation", path: "/attack", icon: Skull },
      { label: "Activity Logs", path: "/logs", icon: ScrollText },
    ],
  },
];

const userSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Upload", path: "/upload", icon: Upload },
      { label: "My Files", path: "/my-files", icon: Activity },
      { label: "Profile Settings", path: "/profile-settings", icon: UserCircle2 },
    ],
  },
  {
    title: "Security",
    items: [{ label: "Security Status", path: "/security-status", icon: ShieldCheck }],
  },
];

export default function Sidebar({ role, isOpen, onClose }) {
  const sections = role === "admin" ? adminSections : userSections;
  const isAdmin = role === "admin";

  const baseItemClasses =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/10 bg-[#111827] transition-transform",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#3B82F6]/15 p-2">
              <Shield className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">CDSV</p>
              <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">
                {isAdmin ? "Admin Console" : "User Workspace"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-auto p-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs uppercase tracking-wider text-[#6B7280]">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        baseItemClasses,
                        isActive
                          ? "bg-[#3B82F6]/15 text-[#60A5FA]"
                          : "text-[#9CA3AF] hover:bg-white/5 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {isAdmin ? (
            <div className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-3 text-xs text-[#9CA3AF]">
              <div className="mb-2 flex items-center gap-2 text-[#10B981]">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-medium">System Status: Healthy</span>
              </div>
              <p>Threat detection, AI analysis, and logs are fully operational.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[#9CA3AF]">
              <div className="mb-2 flex items-center gap-2 text-white">
                <UserCircle2 className="h-4 w-4 text-[#60A5FA]" />
                <span className="font-medium">Signed in as User</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Your uploads are encrypted and monitored.</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
