import WorkspaceShellOverlays from "@/components/workspace/WorkspaceChrome";
import { WorkspaceControlProvider } from "@/context/WorkspaceControlContext";
import AppRoutes from "@/routes/AppRoutes";

export default function App() {
  return (
    <WorkspaceControlProvider>
      <>
        <AppRoutes />
        <WorkspaceShellOverlays />
      </>
    </WorkspaceControlProvider>
  );
}
