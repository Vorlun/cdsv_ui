import { memo } from "react";
import { motion } from "motion/react";
import { DashboardAnimatedCounter } from "./DashboardAnimatedCounter";

const StatTile = memo(function StatTile({ item }) {
  const Icon = item.icon;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`rounded-2xl border border-white/10 bg-[#111827] p-4 transition-all duration-300 ${item.borderGlow ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{item.label}</p>
        {Icon ? <Icon className={`h-4.5 w-4.5 ${item.iconColor ?? "text-[#93C5FD]"}`} /> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold text-[#E5E7EB]">
        <DashboardAnimatedCounter value={item.value} />
      </p>
      <p
        className={`mt-1 text-xs ${
          String(item.trend ?? "").startsWith("+") ? "text-[#34D399]" : "text-[#FCA5A5]"
        }`}
      >
        {item.trend} vs last week
      </p>
      <div className="mt-3 flex h-8 items-end gap-1">
        {(item.spark ?? []).map((value, idx) => (
          <div
            key={`${item.key}-${idx}`}
            className="w-full rounded-t-sm bg-[#3B82F6]/60"
            style={{ height: `${Math.min(Math.max(Number(value), 4), 100)}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
});

const PulseTile = memo(function PulseTile() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
      <div className="h-3 w-24 animate-pulse rounded bg-white/[0.08]" />
      <div className="mt-5 h-8 w-20 animate-pulse rounded bg-white/[0.1]" />
      <div className="mt-2 h-3 w-36 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-6 flex h-8 items-end gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`p-${String(i)}`}
            className="w-full animate-pulse rounded-t-sm bg-white/[0.08]"
            style={{ height: `${12 + ((i * 7) % 72)}%` }}
          />
        ))}
      </div>
    </div>
  );
});

export default memo(function DashboardStatGrid({ cards, loading = false }) {
  if (loading) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-busy>
        <PulseTile />
        <PulseTile />
        <PulseTile />
        <PulseTile />
        <PulseTile />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {(cards ?? []).map((card) => (
        <StatTile key={card.key} item={card} />
      ))}
    </section>
  );
});
