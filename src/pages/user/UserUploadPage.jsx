import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UserUploadPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const onPick = (targetFile) => {
    if (!targetFile) return;
    setFile(targetFile);
    setDone(false);
    setProgress(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, 130);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#111827] p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Upload File</h2>
        <div
          onDrop={(event) => {
            event.preventDefault();
            onPick(event.dataTransfer.files?.[0] || null);
          }}
          onDragOver={(event) => event.preventDefault()}
          className="rounded-2xl border-2 border-dashed border-[#3B82F6]/50 bg-[#0F172A] p-10 text-center"
        >
          <UploadCloud className="mx-auto h-10 w-10 text-[#60A5FA]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">Drag and drop a file or use select button.</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => onPick(event.target.files?.[0] || null)}
          />
          <button
            className="mt-4 rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
            onClick={() => inputRef.current?.click()}
          >
            Select File
          </button>
        </div>

        {file && (
          <div className="mt-5 rounded-xl border border-white/10 bg-[#0F172A] p-4">
            <p className="text-sm text-[#E5E7EB]">{file.name}</p>
            <p className="text-xs text-[#9CA3AF]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#3B82F6]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-[#10B981]/20 px-2 py-1 text-xs text-[#6EE7B7]">Encrypted</span>
              <span className="rounded-full bg-[#3B82F6]/20 px-2 py-1 text-xs text-[#BFDBFE]">Safe</span>
              {done && <span className="rounded-full bg-[#10B981]/20 px-2 py-1 text-xs text-[#6EE7B7]">Upload Success</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
