import { useAuth } from "../../context/AuthContext";

export default function UserProfilePage() {
  const { user } = useAuth();
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#111827] p-6">
        <h2 className="mb-4 text-xl font-semibold text-white">Profile</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            readOnly
            value={user?.fullName || ""}
            className="rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white"
          />
          <input
            readOnly
            value={user?.email || ""}
            className="rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white"
          />
          <input
            type="password"
            placeholder="Change password"
            className="rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white md:col-span-2"
          />
        </div>
      </div>
    </div>
  );
}
