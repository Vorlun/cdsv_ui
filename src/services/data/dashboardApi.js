import { apiRequest } from "@/services/api/apiRequest";

export async function fetchAdminDashboardSnapshot() {
  return apiRequest("/soc/admin/dashboard/overview", { method: "GET" });
}

export const METRIC_DEFINITIONS = [];
