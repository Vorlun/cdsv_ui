export default function SectionHeader({ title, subtitle, rightSlot }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-semibold text-[#E5E7EB]">{title}</h2>
        {subtitle ? <p className="text-sm text-[#94A3B8]">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div>{rightSlot}</div> : null}
    </div>
  );
}
