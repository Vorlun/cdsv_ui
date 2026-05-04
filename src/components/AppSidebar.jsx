import { memo, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SidebarItem } from "@/components/sidebar/SidebarItem";

function collapseKey(namespace) {
  return `cdsv_sidebar_collapsed_${namespace}`;
}

export function readInitialCollapsed(namespace = "shell") {
  try {
    return window.sessionStorage.getItem(collapseKey(namespace)) === "1";
  } catch {
    return false;
  }
}

function AppSidebarInner({
  persistNamespace = "shell",
  title,
  subtitle,
  sections,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  isLight = false,
}) {
  const persistCollapse = useCallback(
    (next) => {
      try {
        window.sessionStorage.setItem(collapseKey(persistNamespace), next ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [persistNamespace],
  );

  const handleToggle = useCallback(() => {
    const next = !collapsed;
    onToggleCollapse(next);
    persistCollapse(next);
  }, [collapsed, onToggleCollapse, persistCollapse]);

  const widthClass = collapsed ? "w-[4.5rem]" : "w-64";
  const asideClassName = [
    "fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-200 ease-out",
    isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[#111827]",
    widthClass,
    isOpen ? "translate-x-0" : "-translate-x-full",
    "lg:translate-x-0",
  ].join(" ");

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close navigation overlay"
        />
      ) : null}
      <aside className={asideClassName} aria-label="Primary navigation">
        <div
          className={[
            "flex items-center border-b p-4",
            isLight ? "border-slate-200" : "border-white/10",
            collapsed ? "flex-col gap-2" : "justify-between",
          ].join(" ")}
        >
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{title}</p>
              <p className={`truncate text-xs uppercase tracking-wide ${isLight ? "text-slate-500" : "text-[#9CA3AF]"}`}>{subtitle}</p>
            </div>
          ) : (
            <span className="sr-only">
              {title} — {subtitle}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`hidden rounded-lg p-2 lg:inline-flex ${isLight ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900" : "text-[#9CA3AF] hover:bg-white/10 hover:text-white"}`}
              onClick={handleToggle}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className={`rounded-lg p-2 lg:hidden ${isLight ? "text-slate-600 hover:bg-slate-100" : "text-[#9CA3AF] hover:bg-white/10 hover:text-white"}`}
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3">
          {sections.map((section) => (
            <div key={section.id}>
              {!collapsed ? (
                <p className={`mb-2 px-2 text-xs uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#6B7280]"}`}>{section.title}</p>
              ) : (
                <div className={`mx-auto mb-2 h-px w-8 ${isLight ? "bg-slate-200" : "bg-white/10"}`} aria-hidden />
              )}
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <SidebarItem key={item.id} item={item} collapsed={collapsed} onNavigate={onClose} isLight={isLight} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default memo(AppSidebarInner);
