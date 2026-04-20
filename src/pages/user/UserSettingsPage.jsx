import { useState } from "react";

export default function UserSettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [storageMode, setStorageMode] = useState("encrypted");

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#111827] p-6">
        <h2 className="mb-5 text-xl font-semibold text-white">User Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#E5E7EB]">
            Notification Alerts
            <input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} />
          </label>
          <div>
            <p className="mb-2 text-sm text-[#E5E7EB]">Theme</p>
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white">
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm text-[#E5E7EB]">Storage Mode</p>
            <select value={storageMode} onChange={(event) => setStorageMode(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white">
              <option value="encrypted">Encrypted</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <button className="rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
