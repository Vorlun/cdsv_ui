import { UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfileSettingsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#E5E7EB]">Profile Settings</h1>
          <p className="text-[#9CA3AF]">Manage your personal account preferences.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserCircle2 className="h-8 w-8 text-[#60A5FA]" />
            <div>
              <p className="font-semibold text-white">User Account</p>
              <p className="text-sm text-[#9CA3AF]">user@cdsv.io</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              defaultValue="User"
              className="rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
            />
            <input
              defaultValue="user@cdsv.io"
              className="rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]">
              Save profile
            </button>
            <Link
              to="/upload"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#E5E7EB] hover:bg-white/5"
            >
              Back to Upload
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
