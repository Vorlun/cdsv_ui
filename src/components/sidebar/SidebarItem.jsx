import { memo } from "react";
import { NavLink } from "react-router-dom";

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function SidebarItemInner({ item, collapsed, onNavigate, isLight = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        joinClassNames(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/80",
          collapsed ? "justify-center" : "",
          isActive
            ? isLight
              ? "bg-sky-100 text-sky-800"
              : "bg-[#3B82F6]/15 text-[#60A5FA]"
            : isLight
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "text-[#9CA3AF] hover:bg-white/5 hover:text-white",
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

export const SidebarItem = memo(SidebarItemInner);
