const cards = [
  { label: "My Uploads", value: "46" },
  { label: "Last Login", value: "Today 09:42" },
  { label: "Security Score", value: "94/100" },
  { label: "Recent Activity", value: "12 events" },
];

export default function UserDashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-2xl font-bold text-white">User Dashboard</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#111827] p-4">
              <p className="text-xs uppercase tracking-wide text-[#9CA3AF]">{item.label}</p>
              <p className="mt-2 text-xl font-semibold text-[#E5E7EB]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
