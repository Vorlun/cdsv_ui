export default function DataTable({ columns, children, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95 ${className}`}>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[980px]">
          <thead className="sticky top-0 z-10 bg-[#0F172A] shadow-[0_10px_18px_rgba(2,6,23,0.4)]">
            <tr className="text-left text-xs uppercase tracking-wide text-[#9CA3AF]">
              {columns.map((col) => (
                <th key={col} className="px-3 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
