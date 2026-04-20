export default function StatusBadge({ tone = "neutral", children }) {
  const className =
    tone === "success"
      ? "bg-[#10B981]/20 text-[#86EFAC]"
      : tone === "warning"
        ? "bg-[#F59E0B]/20 text-[#FDE68A]"
        : tone === "danger"
          ? "bg-[#EF4444]/20 text-[#FCA5A5]"
          : tone === "info"
            ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
            : "bg-white/10 text-[#D1D5DB]";
  return <span className={`rounded-full px-2 py-1 text-xs ${className}`}>{children}</span>;
}
