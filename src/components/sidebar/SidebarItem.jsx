import { memo } from "react";
import { NavLink } from "react-router-dom";

function SidebarItemInner({ item, collapsed, onNavigate, isLight = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => {
        const base = "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80";
        const collapse = collapsed ? "justify-center" : "";
        const active = isActive
          ? isLight
            ? "bg-sky-100 text-sky-800 shadow-sm"
            : "bg-gradient-to-r from-cyan-400/[0.12] to-sky-400/[0.06] text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)] before:absolute before:-left-3 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-[3px] before:rounded-r-full before:bg-cyan-400 before:shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          : isLight
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200";
        return [base, collapse, active].filter(Boolean).join(" ");
      }}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={[
              "h-[18px] w-[18px] shrink-0 transition-all duration-200",
              isActive
                ? isLight ? "text-sky-700" : "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                : "text-current",
            ].join(" ")}
            aria-hidden
          />
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

export const SidebarItem = memo(SidebarItemInner);
