import { useWorkspaceControl } from "@/context/WorkspaceControlContext";
import SocUserPageShell from "@/components/soc/SocUserPageShell";
import SocSecureUpload from "@/features/soc-upload/SocSecureUpload";

export default function UserUploadPage() {
  const { isLight } = useWorkspaceControl();

  return (
    <SocUserPageShell
      title="Secure Evidence Upload"
      subtitle="Encrypted telecom artifact ingestion with SHA-256 integrity verification and AES-256-GCM vault storage."
    >
      {/*
        The upload console is rendered inside the shell so the page header adapts to theme.
        The upload component itself retains its dark SOC terminal aesthetic (intentional).
      */}
      <div className={`overflow-hidden rounded-2xl border ${isLight ? "border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.06)]" : "border-white/10"}`}>
        <SocSecureUpload />
      </div>
    </SocUserPageShell>
  );
}
