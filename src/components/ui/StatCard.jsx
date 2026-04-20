import { useEffect, useState } from "react";

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const frames = 24;
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / frames, 1);
      setDisplay(Math.round(value * progress));
      if (progress >= 1) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

export default function StatCard({ label, value, icon: Icon, trend, tone = "primary" }) {
  const toneClass =
    tone === "danger"
      ? "text-[#FCA5A5]"
      : tone === "success"
        ? "text-[#86EFAC]"
        : tone === "warning"
          ? "text-[#FDE68A]"
          : "text-[#93C5FD]";
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-[0_0_16px_rgba(59,130,246,0.08)] transition hover:-translate-y-0.5 hover:border-[#3B82F6]/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[#94A3B8]">{label}</span>
        {Icon ? (
          <span className="rounded-lg border border-white/10 bg-[#0B1220] p-2">
            <Icon className={`h-4 w-4 ${toneClass}`} />
          </span>
        ) : null}
      </div>
      <div className="text-[40px] font-bold leading-none text-white">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      {trend ? <div className="mt-2 text-xs text-[#94A3B8]">{trend}</div> : null}
    </div>
  );
}
