import clsx from "clsx";

/**
 * Shared chrome for user-area SOC pages (spacing, max width, header card).
 */
export default function SocUserPageShell({ title, subtitle, badge, children, className }) {
  return (
    <div className={clsx("min-h-0 bg-[#0B0F1A] p-6 md:p-8", className)}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-white/10 bg-[#111827] px-6 py-5 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.55)] transition-shadow duration-300 hover:shadow-[0_16px_48px_-24px_rgba(14,165,233,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[1.65rem]">{title}</h1>
              {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{subtitle}</p> : null}
            </div>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
