/**
 * @param {{ title: string, description?: string, action?: import('react').ReactNode }} props
 */
export function EmptyState({ title, description, action }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-white/15 bg-[#0f172a]/80 px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-base font-medium text-[#e2e8f0]">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-[#94a3b8]">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
