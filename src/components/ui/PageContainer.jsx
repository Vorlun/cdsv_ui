export default function PageContainer({ title, subtitle, children }) {
  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <div className="relative mx-auto max-w-7xl space-y-4">
        {(title || subtitle) ? (
          <section className="rounded-2xl border border-white/10 bg-[#0F172A]/90 p-6 shadow-[0_0_18px_rgba(59,130,246,0.12)]">
            {title ? <h1 className="text-[42px] font-semibold tracking-tight text-white">{title}</h1> : null}
            {subtitle ? <p className="mt-2 text-sm text-[#94A3B8]">{subtitle}</p> : null}
          </section>
        ) : null}
        {children}
      </div>
    </div>
  );
}
