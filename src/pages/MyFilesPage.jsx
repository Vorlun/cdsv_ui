import { FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyFilesPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#E5E7EB]">My Files</h1>
          <p className="text-[#9CA3AF]">View and manage your recent uploads.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <UploadCloud className="mb-3 h-6 w-6 text-[#60A5FA]" />
            <p className="text-2xl font-semibold text-white">24</p>
            <p className="text-sm text-[#9CA3AF]">Files uploaded</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <ShieldCheck className="mb-3 h-6 w-6 text-[#10B981]" />
            <p className="text-2xl font-semibold text-white">24</p>
            <p className="text-sm text-[#9CA3AF]">Files secured</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <FileText className="mb-3 h-6 w-6 text-[#F59E0B]" />
            <p className="text-2xl font-semibold text-white">3</p>
            <p className="text-sm text-[#9CA3AF]">Require attention</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
          <p className="mb-3 text-sm text-[#9CA3AF]">
            Need to upload more content for analysis?
          </p>
          <Link
            to="/upload"
            className="inline-flex rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            Go to Upload
          </Link>
        </div>
      </div>
    </div>
  );
}
