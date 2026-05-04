import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Globe, Shield, User } from "lucide-react";
import { Card } from "@/components/cdsv/Card";
import { Button } from "@/components/cdsv/Button";
import { Badge } from "@/components/cdsv/Badge";
import { logsData } from "../data/logsData";

export default function LogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const log = useMemo(() => logsData.find(entry => entry.id === id), [id]);

  if (!log) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-5xl">
          <Card glass className="border border-[#EF4444]/30">
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-[#E5E7EB]">Log entry not found</h1>
              <p className="text-sm text-[#9CA3AF]">The requested incident id does not exist.</p>
              <Button variant="secondary" onClick={() => navigate("/logs")} className="w-fit">
                <ArrowLeft className="h-4 w-4" />
                Back to Logs
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const badge =
    log.status === "error" ? <Badge variant="danger">Error</Badge> : log.status === "warning" ? <Badge variant="warning">Warning</Badge> : <Badge variant="secure">Info</Badge>;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB]">Log Incident #{log.id}</h1>
            <p className="mt-1 text-sm text-[#9CA3AF]">Deep event investigation view for SOC response.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/logs")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Logs
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card glass>
            <h2 className="mb-4 text-lg font-semibold text-[#E5E7EB]">Event Overview</h2>
            <div className="space-y-2 text-sm text-[#E5E7EB]">
              <p className="flex items-center gap-2">{badge}</p>
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-[#9CA3AF]" />{log.user}</p>
              <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-[#9CA3AF]" />{log.ip}</p>
              <p><span className="text-[#9CA3AF]">Timestamp:</span> {log.timestamp.replace("T", " ").replace("Z", "")}</p>
              <p><span className="text-[#9CA3AF]">Action:</span> {log.action}</p>
              <p><span className="text-[#9CA3AF]">Resource:</span> {log.resource}</p>
            </div>
          </Card>

          <Card glass>
            <h2 className="mb-4 text-lg font-semibold text-[#E5E7EB]">Threat Analysis</h2>
            <div className="space-y-2 text-sm text-[#E5E7EB]">
              <p><span className="text-[#9CA3AF]">Threat Type:</span> {log.threatType}</p>
              <p><span className="text-[#9CA3AF]">Risk Level:</span> {log.riskLevel}</p>
              <p><span className="text-[#9CA3AF]">Geo:</span> {log.geo}</p>
              <p><span className="text-[#9CA3AF]">Device:</span> {log.device}</p>
              <p className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-[#FCD34D]">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {log.details}
              </p>
            </div>
          </Card>
        </div>

        <Card glass>
          <h2 className="mb-4 text-lg font-semibold text-[#E5E7EB]">System Response</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#E5E7EB]">
              <p className="mb-2 flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-[#3B82F6]" />Firewall</p>
              <p className="text-[#9CA3AF]">{log.firewall}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#E5E7EB]">
              <p className="mb-2 font-medium">Action Taken</p>
              <p className="text-[#9CA3AF]">{log.responseAction}</p>
            </div>
          </div>
        </Card>

        <Card glass>
          <h2 className="mb-4 text-lg font-semibold text-[#E5E7EB]">Raw Log Data</h2>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#0B1220] p-4 text-xs text-[#9CA3AF]">
            {JSON.stringify(log.raw, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
