import clsx from "clsx";
import { useWorkspaceControl } from "@/context/WorkspaceControlContext";

/**
 * Shared chrome for user-area SOC pages (spacing, max width, header card).
 * Fully light/dark aware via WorkspaceControlContext.
 */
export default function SocUserPageShell({ title, subtitle, badge, children, className }) {
  const { isLight } = useWorkspaceControl();

  return (
    <div
      className={clsx(
        "min-h-0 p-6 md:p-8 xl:px-10 2xl:px-12 transition-colors duration-200",
        isLight ? "bg-[#eef2f7]" : "bg-[#0B0F1A]",
        className,
      )}
    >
      <div className="mx-auto max-w-[1680px] space-y-5">
        <header
          className={clsx(
            "rounded-2xl border px-6 py-5 transition-colors duration-200",
            isLight
              ? "border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
              : "border-white/[0.08] bg-[#0d1527] shadow-[0_8px_32px_-16px_rgba(0,0,0,0.6)]",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className={clsx(
                  "text-[42px] font-semibold leading-tight tracking-[-0.03em]",
                  isLight ? "text-slate-900" : "text-white",
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className={clsx("mt-1.5 max-w-2xl text-sm", isLight ? "text-slate-500" : "text-slate-400")}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {badge ? <div className="shrink-0 pt-1">{badge}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
