import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, RotateCcw, Save } from "lucide-react";

const tabs = [
  "General",
  "Security",
  "Notifications",
  "Access Roles",
  "Integrations",
  "Backup & Recovery",
  "Branding",
  "Audit",
];

function ToggleRow({ label, checked, onChange, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#E5E7EB]">{label}</div>
          {description ? <div className="text-xs text-[#94A3B8]">{description}</div> : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 rounded-full transition ${
            checked ? "bg-[#3B82F6]" : "bg-[#334155]"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("Security");
  const [toast, setToast] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const [security, setSecurity] = useState({
    sensitivity: 76,
    autoBlock: true,
    force2fa: true,
    timeout: 30,
    passwordPolicy: "Strict",
    requireEncryption: true,
    trustedOnly: false,
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklySummary: false,
    criticalOnly: false,
  });

  const [backup, setBackup] = useState({
    daily: true,
    lastStatus: "Success · 02:15 UTC",
  });

  const [rolePermissions, setRolePermissions] = useState({
    viewThreats: { Admin: true, Analyst: true, Viewer: true },
    blockIp: { Admin: true, Analyst: true, Viewer: false },
    manageUsers: { Admin: true, Analyst: false, Viewer: false },
    exportLogs: { Admin: true, Analyst: true, Viewer: false },
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const updateSecurity = (patch) => {
    setSecurity((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const updateNotifications = (patch) => {
    setNotifications((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const updateBackup = (patch) => {
    setBackup((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const renderSecurity = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-[#E5E7EB]">Threat Detection Sensitivity</span>
          <span className="text-sm text-[#93C5FD]">{security.sensitivity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={security.sensitivity}
          onChange={(event) => updateSecurity({ sensitivity: Number(event.target.value) })}
          className="w-full accent-[#3B82F6]"
        />
      </div>

      <ToggleRow label="Auto Block Suspicious IPs" description="Automatically quarantine IPs that exceed risk threshold." checked={security.autoBlock} onChange={(value) => updateSecurity({ autoBlock: value })} />
      <ToggleRow label="Force 2FA for Admins" description="Require second factor challenge for all administrator accounts." checked={security.force2fa} onChange={(value) => updateSecurity({ force2fa: value })} />
      <ToggleRow label="Require File Encryption" description="Reject uploads that do not meet encryption policy." checked={security.requireEncryption} onChange={(value) => updateSecurity({ requireEncryption: value })} />
      <ToggleRow label="Trusted Devices Only" description="Allow login only from previously approved devices." checked={security.trustedOnly} onChange={(value) => updateSecurity({ trustedOnly: value })} />

      <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Session Timeout (minutes)</div>
          <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-[#111827]">
            {[15, 30, 45, 60].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateSecurity({ timeout: item })}
                className={`px-3 py-2 text-xs transition ${
                  security.timeout === item
                    ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                    : "text-[#9CA3AF] hover:bg-white/5"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
      </div>
      <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
          <div className="mb-2 text-sm font-medium text-[#E5E7EB]">Password Policy Level</div>
          <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-[#111827]">
            {["Standard", "Strict", "Maximum"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateSecurity({ passwordPolicy: item })}
                className={`px-3 py-2 text-xs transition ${
                  security.passwordPolicy === item
                    ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                    : "text-[#9CA3AF] hover:bg-white/5"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <ToggleRow label="Email Alerts" checked={notifications.email} onChange={(value) => updateNotifications({ email: value })} />
      <ToggleRow label="Push Alerts" checked={notifications.push} onChange={(value) => updateNotifications({ push: value })} />
      <ToggleRow label="Weekly Summary" checked={notifications.weeklySummary} onChange={(value) => updateNotifications({ weeklySummary: value })} />
      <ToggleRow label="Critical Incidents Only" checked={notifications.criticalOnly} onChange={(value) => updateNotifications({ criticalOnly: value })} />
    </div>
  );

  const renderBackup = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <ToggleRow label="Daily Backup" checked={backup.daily} onChange={(value) => updateBackup({ daily: value })} />
      <div className="rounded-[18px] border border-white/10 bg-[#0F172A]/85 p-4">
        <div className="text-sm font-medium text-[#E5E7EB]">Last Backup Status</div>
        <div className="mt-1 text-xs text-[#94A3B8]">{backup.lastStatus}</div>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button type="button" onClick={() => showToast("Configuration exported")} className="rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-sm text-[#BFDBFE] transition hover:bg-[#3B82F6]/20">Export Config</button>
        <button type="button" onClick={() => showToast("Restore workflow started")} className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FDE68A] transition hover:bg-[#F59E0B]/20">Restore Config</button>
      </div>
    </div>
  );

  const renderAccessRoles = () => (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
      <div className="mb-3 text-sm font-medium text-[#E5E7EB]">Access Role Permission Matrix</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#94A3B8]">
              <th className="px-2 py-2">Permission</th>
              <th className="px-2 py-2">Admin</th>
              <th className="px-2 py-2">Analyst</th>
              <th className="px-2 py-2">Viewer</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rolePermissions).map(([permission, row]) => (
              <tr key={permission} className="border-t border-white/10 text-[#D1D5DB]">
                <td className="px-2 py-2">{permission}</td>
                {["Admin", "Analyst", "Viewer"].map((role) => (
                  <td key={role} className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRolePermissions((prev) => ({
                          ...prev,
                          [permission]: { ...prev[permission], [role]: !prev[permission][role] },
                        }));
                        setHasChanges(true);
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        row[role] ? "bg-[#10B981]/20 text-[#86EFAC]" : "bg-white/10 text-[#9CA3AF]"
                      }`}
                    >
                      {row[role] ? "Allowed" : "Denied"}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPlaceholder = (title, description) => (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-4">
      <div className="text-sm font-medium text-[#E5E7EB]">{title}</div>
      <div className="mt-1 text-xs text-[#94A3B8]">{description}</div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "Security") return renderSecurity();
    if (activeTab === "Notifications") return renderNotifications();
    if (activeTab === "Backup & Recovery") return renderBackup();
    if (activeTab === "Access Roles") return renderAccessRoles();
    if (activeTab === "General") return renderPlaceholder("General Preferences", "Manage region, language, tenant name and platform defaults.");
    if (activeTab === "Integrations") return renderPlaceholder("Integrations", "Connect SIEM, ticketing and webhook integrations.");
    if (activeTab === "Branding") return renderPlaceholder("Branding", "Configure logos, colors and custom identity elements.");
    return renderPlaceholder("Audit Settings", "Configure retention, tamper-protection and audit export policies.");
  };

  return (
    <div className="relative overflow-hidden p-6 md:p-8">
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-0 top-10 h-[320px] w-[320px] rounded-full bg-[#3B82F6]/12 blur-3xl" animate={{ x: [0, 14, 0], y: [0, -10, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute right-0 top-20 h-[320px] w-[320px] rounded-full bg-[#22D3EE]/10 blur-3xl" animate={{ x: [0, -12, 0], y: [0, 12, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-white/10 bg-[#0F172A]/90 p-5 shadow-[0_0_20px_rgba(59,130,246,0.14)]">
          <h1 className="text-[42px] font-semibold tracking-tight text-white">Security Control Center</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Configure security policies, alerts and platform preferences.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827]/95 p-4">
          <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
            <aside className="rounded-xl border border-white/10 bg-[#0F172A]/85 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeTab === tab
                      ? "bg-[#3B82F6]/20 text-[#BFDBFE]"
                      : "text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </aside>

            <div className="relative min-h-[420px] rounded-[18px] border border-white/10 bg-[#0F172A]/70 p-4 pb-24">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <div className="mb-3 text-sm font-semibold text-[#E5E7EB]">{activeTab}</div>
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>

              {hasChanges ? <div className="sticky bottom-0 mt-5 rounded-[18px] border border-white/10 bg-[#0B1220]/95 p-3 backdrop-blur">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { showToast("Settings saved"); setHasChanges(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/20 px-3 py-2 text-sm text-[#BFDBFE] shadow-[0_0_12px_rgba(59,130,246,0.25)] transition hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button type="button" onClick={() => { showToast("Defaults restored"); setHasChanges(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-sm text-[#FDE68A] transition hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]">
                    <RotateCcw className="h-4 w-4" />
                    Reset Defaults
                  </button>
                  <button type="button" onClick={() => showToast("Settings export generated")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-sm text-[#A7F3D0] transition hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]">
                    <Download className="h-4 w-4" />
                    Export Settings
                  </button>
                </div>
              </div> : null}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed bottom-4 right-4 z-[80] rounded-lg border border-[#3B82F6]/30 bg-[#0F172A]/95 px-3 py-2 text-sm text-[#E5E7EB] shadow-[0_0_14px_rgba(59,130,246,0.25)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
