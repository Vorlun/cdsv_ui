import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Download, FileLock2, MoreHorizontal, ShieldAlert, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageContainer from "../../components/ui/PageContainer";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import DataTable from "../../components/ui/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import ActionMenu from "../../components/ui/ActionMenu";

const seedUploads = [
  { id: "u1", fileName: "finance_q4.csv", user: "user@test.com", fileType: "CSV", sizeMb: 4.2, uploadTime: "10:08", encryption: "Encrypted", scanResult: "Safe", risk: "Low" },
  { id: "u2", fileName: "sales_dump.json", user: "admin@test.com", fileType: "JSON", sizeMb: 1.8, uploadTime: "10:14", encryption: "Encrypted", scanResult: "Review", risk: "Medium" },
  { id: "u3", fileName: "legacy_script.exe", user: "user@test.com", fileType: "EXE", sizeMb: 0.6, uploadTime: "10:22", encryption: "Unencrypted", scanResult: "Threat", risk: "High" },
  { id: "u4", fileName: "incident_report.pdf", user: "soc.viewer@test.com", fileType: "PDF", sizeMb: 2.4, uploadTime: "10:29", encryption: "Encrypted", scanResult: "Safe", risk: "Low" },
  { id: "u5", fileName: "archive_dump.zip", user: "reviewer@test.com", fileType: "ZIP", sizeMb: 15.7, uploadTime: "10:41", encryption: "Encrypted", scanResult: "Review", risk: "Medium" },
];

const uploadTimeline = [
  { time: "08:00", volume: 12 },
  { time: "09:00", volume: 18 },
  { time: "10:00", volume: 26 },
  { time: "11:00", volume: 21 },
  { time: "12:00", volume: 31 },
  { time: "13:00", volume: 28 },
];

const fileTypes = [
  { name: "CSV", value: 26, color: "#3B82F6" },
  { name: "JSON", value: 20, color: "#22D3EE" },
  { name: "PDF", value: 18, color: "#10B981" },
  { name: "ZIP", value: 14, color: "#F59E0B" },
  { name: "EXE", value: 22, color: "#EF4444" },
];

const suspiciousFeed = [
  { id: "s1", text: "legacy_script.exe flagged by static analyzer", severity: "Threat", time: "2m ago" },
  { id: "s2", text: "archive_dump.zip contains encrypted unknown payload", severity: "Review", time: "6m ago" },
  { id: "s3", text: "bulk_upload.tar exceeded size policy threshold", severity: "Review", time: "12m ago" },
];

function badgeColor(result) {
  if (result === "Safe") return "bg-[#10B981]/20 text-[#86EFAC]";
  if (result === "Review") return "bg-[#F59E0B]/20 text-[#FDE68A]";
  return "bg-[#EF4444]/20 text-[#FCA5A5]";
}

function riskColor(risk) {
  if (risk === "Low") return "text-[#6EE7B7]";
  if (risk === "Medium") return "text-[#FDE68A]";
  return "text-[#FCA5A5]";
}

export default function AdminUploadActivityPage() {
  const [uploads, setUploads] = useState(seedUploads);
  const [activeMenu, setActiveMenu] = useState(null);
  const [toast, setToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [page, setPage] = useState(1);
  const menuRef = useRef(null);
  const pageSize = 5;

  const metrics = useMemo(() => {
    const totalSize = uploads.reduce((sum, item) => sum + item.sizeMb, 0);
    const encrypted = uploads.filter((item) => item.encryption === "Encrypted").length;
    const suspicious = uploads.filter((item) => item.scanResult !== "Safe").length;
    const failed = uploads.filter((item) => item.scanResult === "Threat").length;
    return [
      { label: "Files Uploaded Today", value: uploads.length, icon: UploadCloud, trend: "+9%" },
      { label: "Total Size Uploaded", value: totalSize.toFixed(1), icon: FileLock2, trend: "+14%", suffix: " GB" },
      { label: "Encrypted Files", value: encrypted, icon: ShieldCheck, trend: "+7%" },
      { label: "Suspicious Uploads", value: suspicious, icon: AlertTriangle, trend: "+3%" },
      { label: "Failed Uploads", value: failed, icon: XCircle, trend: "+2%" },
    ];
  }, [uploads]);

  const pageCount = Math.max(1, Math.ceil(uploads.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedUploads = uploads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const fakeUpload = () => {
    const id = `upload-${Date.now()}`;
    const now = new Date();
    setUploads((prev) => [
      {
        id,
        fileName: `upload_${prev.length + 1}.dat`,
        user: "user@test.com",
        fileType: "DAT",
        sizeMb: 3.1,
        uploadTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        encryption: "Encrypted",
        scanResult: "Safe",
        risk: "Low",
      },
      ...prev,
    ]);
    showToast("Upload simulation completed");
  };

  const runAction = (id, action) => {
    if (action === "quarantine") {
      setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, scanResult: "Threat", risk: "High" } : item)));
      showToast("File quarantined");
    } else if (action === "delete") {
      setUploads((prev) => prev.filter((item) => item.id !== id));
      showToast("File deleted");
    } else if (action === "rescan") {
      showToast("Re-scan started");
    } else if (action === "download") {
      showToast("Audit report downloaded");
    } else {
      showToast("Upload details opened");
    }
    setActiveMenu(null);
  };

  return (
    <PageContainer
      title="Secure Upload Control Center"
      subtitle="Monitor file transfers, encryption status and scan results."
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-0 top-10 h-[360px] w-[360px] rounded-full bg-[#3B82F6]/10 blur-3xl" animate={{ x: [0, 16, 0], y: [0, -12, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute right-0 top-24 h-[360px] w-[360px] rounded-full bg-[#22D3EE]/10 blur-3xl" animate={{ x: [0, -18, 0], y: [0, 10, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative space-y-4">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            return <StatCard key={metric.label} label={metric.label} value={Number(metric.value)} icon={metric.icon} trend={`${metric.trend} today`} />;
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <SectionHeader title="Upload Volume Timeline" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uploadTimeline}>
                  <defs>
                    <linearGradient id="uploadLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="volume" stroke="#22D3EE" strokeWidth={2.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
            <SectionHeader title="File Type Distribution" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fileTypes} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {fileTypes.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-0">
            <SectionHeader title="Upload Activity" />
            <DataTable columns={["File Name", "User", "File Type", "Size", "Upload Time", "Encryption Status", "Scan Result", "Risk Level", "Actions"]}>
                  {pagedUploads.map((row, index) => (
                    <tr key={row.id} className={`border-b border-white/5 text-sm text-[#E5E7EB] transition hover:bg-[#1A2436]/65 ${index % 2 === 0 ? "bg-[#0F172A]/45" : "bg-[#111827]/55"}`}>
                      <td className="px-3 py-3 font-medium">{row.fileName}</td>
                      <td className="px-3 py-3 text-[#C7D2FE]">{row.user}</td>
                      <td className="px-3 py-3">{row.fileType}</td>
                      <td className="px-3 py-3">{row.sizeMb.toFixed(1)} MB</td>
                      <td className="px-3 py-3">{row.uploadTime}</td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={row.encryption === "Encrypted" ? "success" : "danger"}>{row.encryption}</StatusBadge>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={row.scanResult === "Safe" ? "success" : row.scanResult === "Review" ? "warning" : "danger"}>{row.scanResult}</StatusBadge>
                      </td>
                      <td className={`px-3 py-3 font-medium ${riskColor(row.risk)}`}>{row.risk}</td>
                      <td className="relative px-3 py-3" ref={activeMenu === row.id ? menuRef : null}>
                        <button type="button" onClick={() => setActiveMenu((prev) => (prev === row.id ? null : row.id))} className="rounded-md border border-white/10 p-1.5 text-[#9CA3AF] hover:border-[#3B82F6]/35 hover:text-[#BFDBFE]">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <ActionMenu
                          open={activeMenu === row.id}
                          onClose={() => setActiveMenu(null)}
                          items={[
                            { label: "View Details", onClick: () => runAction(row.id, "details") },
                            { label: "Quarantine File", onClick: () => runAction(row.id, "quarantine"), className: "text-[#FCA5A5]" },
                            { label: "Delete", onClick: () => runAction(row.id, "delete"), className: "text-[#FCA5A5]" },
                            { label: "Download Audit", onClick: () => runAction(row.id, "download"), className: "text-[#BFDBFE]" },
                            { label: "Re-scan", onClick: () => runAction(row.id, "rescan"), className: "text-[#A7F3D0]" },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
            </DataTable>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2 text-sm text-[#9CA3AF]">
              <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, uploads.length)} of {uploads.length}</span>
              <div className="flex gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-40">Prev</button>
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} className="rounded border border-white/10 px-2 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="rounded-2xl border border-[#EF4444]/25 bg-[#111827]/95 p-4">
              <SectionHeader title="Suspicious Upload Alerts" />
              <div className="space-y-2">
                {suspiciousFeed.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-[#0F172A]/80 px-3 py-2.5 text-xs">
                    <div className={`mb-1 inline-flex items-center gap-1 ${item.severity === "Threat" ? "text-[#FCA5A5]" : "text-[#FDE68A]"}`}>
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {item.severity}
                    </div>
                    <div className="leading-5 text-[#E2E8F0]">{item.text}</div>
                    <div className="mt-1 text-[#64748B]">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); fakeUpload(); }}
              className={`rounded-2xl border border-dashed p-5 text-center transition ${
                isDragging
                  ? "animate-pulse border-[#22D3EE]/70 bg-[#22D3EE]/10"
                  : "border-[#3B82F6]/30 bg-[#111827]/95"
              }`}
            >
              <UploadCloud className="mx-auto h-7 w-7 text-[#93C5FD]" />
              <p className="mt-2 text-sm font-medium text-[#E5E7EB]">Drag & Drop Upload Simulation Zone</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Drop a file to simulate secure upload ingestion</p>
              <button type="button" onClick={fakeUpload} className="mt-3 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/15 px-3 py-2 text-xs text-[#BFDBFE] transition hover:bg-[#3B82F6]/25">
                Simulate Upload
              </button>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed bottom-4 right-4 z-[80] rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_16px_rgba(59,130,246,0.25)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
