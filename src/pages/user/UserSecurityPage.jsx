export default function UserSecurityPage() {
  const nodes = ["User Device", "Frontend", "Backend", "Encryption", "Cloud"];
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#111827] p-6">
        <h2 className="mb-5 text-xl font-semibold text-white">Security Status</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {nodes.map((node, idx) => (
            <div key={node} className="rounded-xl border border-white/10 bg-[#0F172A] p-4 text-center">
              <p className="text-sm font-medium text-[#E5E7EB]">{node}</p>
              <p className="mt-1 text-xs text-[#10B981]">Secure</p>
              {idx < nodes.length - 1 ? <p className="mt-2 text-xs text-[#9CA3AF]">→</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
