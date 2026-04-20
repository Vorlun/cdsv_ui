const files = [
  { name: "audit-jan.csv", status: "Safe", uploadedAt: "2026-04-16 09:12" },
  { name: "device-report.pdf", status: "Safe", uploadedAt: "2026-04-16 10:44" },
  { name: "legacy-tool.exe", status: "Suspicious", uploadedAt: "2026-04-16 11:31" },
];

export default function UserFilesPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#111827] p-5">
        <h2 className="mb-4 text-xl font-semibold text-white">My Files</h2>
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3">
              <div>
                <p className="text-sm text-[#E5E7EB]">{file.name}</p>
                <p className="text-xs text-[#9CA3AF]">{file.uploadedAt}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${file.status === "Safe" ? "bg-[#10B981]/20 text-[#6EE7B7]" : "bg-[#F59E0B]/20 text-[#FCD34D]"}`}>
                {file.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
