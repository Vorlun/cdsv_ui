import { useState } from "react";
import { Camera, Clock3, KeyRound, UserCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.fullName || "Security Operator");
  const [email, setEmail] = useState(user?.email || "user@cdsv.io");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#E5E7EB]">Profile</h1>
          <p className="text-[#9CA3AF]">Manage account identity and security credentials.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/20">
                  <UserCircle2 className="h-8 w-8 text-[#60A5FA]" />
                </div>
                <button className="absolute -bottom-1 -right-1 rounded-full bg-[#1F2937] p-1.5 text-[#9CA3AF] hover:text-white">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="font-semibold text-white">{user?.fullName || "Security Operator"}</p>
                <p className="text-sm text-[#9CA3AF]">{user?.email || "user@cdsv.io"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Name
                </label>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#9CA3AF]">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#E5E7EB]">Change Password</h2>
            </div>
            <div className="space-y-3">
              {[
                ["current", "Current Password"],
                ["next", "New Password"],
                ["confirm", "Confirm Password"],
              ].map(([key, label]) => (
                <input
                  key={key}
                  type="password"
                  placeholder={label}
                  value={passwordForm[key]}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
                />
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#9CA3AF]">
              <Clock3 className="h-3.5 w-3.5 text-[#60A5FA]" />
              Last login:{" "}
              {user?.lastLogin
                ? new Date(user.lastLogin).toLocaleString()
                : "Unavailable"}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
