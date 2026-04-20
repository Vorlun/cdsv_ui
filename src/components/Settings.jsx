import { Shield, KeyRound, Save } from "lucide-react";

const securityLevels = [
  {
    key: "basic",
    title: "Basic",
    description: "Standard encryption and baseline monitoring.",
  },
  {
    key: "enhanced",
    title: "Enhanced",
    description: "Stricter controls with anomaly detection enabled.",
  },
  {
    key: "maximum",
    title: "Maximum",
    description: "Highest security posture with aggressive threat policies.",
  },
];

export default function Settings() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h1 className="text-3xl font-bold text-[#E5E7EB]">Settings</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Configure security posture and platform credentials.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-[#E5E7EB]">Security Level</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {securityLevels.map((level) => (
              <div
                key={level.key}
                className="rounded-xl border border-white/10 bg-[#111827]/80 p-4 transition hover:border-[#3B82F6]/50"
              >
                <h3 className="text-sm font-semibold text-[#E5E7EB]">{level.title}</h3>
                <p className="mt-1 text-xs text-[#9CA3AF]">{level.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#10B981]" />
            <h2 className="text-lg font-semibold text-[#E5E7EB]">API Keys</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-[#9CA3AF]">Public Key</p>
              <input
                type="text"
                value={import.meta.env.VITE_STRIPE_KEY || "public_key_configure_in_env"}
                readOnly
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-[#E5E7EB]"
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-[#9CA3AF]">Secret Key</p>
              <input
                type="text"
                value="Managed on backend only"
                readOnly
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-[#9CA3AF]"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2563EB]"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
