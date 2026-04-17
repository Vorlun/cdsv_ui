import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";

export default function SecurityStatusPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#E5E7EB]">Security Status</h1>
          <p className="text-[#9CA3AF]">
            Risk summary for your files and account activity.
          </p>
        </div>

        <div className="rounded-2xl border border-[#10B981]/20 bg-[#10B981]/5 p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-6 w-6 text-[#10B981]" />
            <div>
              <p className="font-semibold text-white">Overall status: Protected</p>
              <p className="text-sm text-[#9CA3AF]">
                No critical threats were detected in your latest uploads.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              <p className="font-medium text-white">Safe files</p>
            </div>
            <p className="text-3xl font-semibold text-[#E5E7EB]">21</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              <p className="font-medium text-white">Needs review</p>
            </div>
            <p className="text-3xl font-semibold text-[#E5E7EB]">3</p>
          </div>
        </div>
      </div>
    </div>
  );
}
