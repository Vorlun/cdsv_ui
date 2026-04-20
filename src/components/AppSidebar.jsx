import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

export default function AppSidebar({ title, subtitle, sections, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}
      <aside
        className={[
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-[#111827] transition-transform",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{subtitle}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-4">
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
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
      </aside>
    </>
  );
}
