import { apiRequest } from "@/services/api/apiRequest";

export async function fetchSecurityLogs(filters = {}) {
  const items = await apiRequest("/security/logs", {
    method: "GET",
  });
  return {
    generatedAt: new Date().toISOString(),
    items: Array.isArray(items?.items) ? items.items : [],
    total: Array.isArray(items?.items) ? items.items.length : 0,
    filters,
  };
}
