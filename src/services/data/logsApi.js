/**
 * Logs / audit timeline — mocked async façade over seeded data.
 */

import { env } from "@/config/env";
import { delay } from "@/utils/delay";
import { apiRequest } from "@/services/api/apiRequest";

export async function fetchSecurityLogs(filters = {}) {
  if (env.useMockApi) {
    await delay(320 + Math.random() * 200);
    const { logsData } = await import("@/data/logsData.js");
    let rows = [...logsData];

    const user = filters.user?.trim();
    if (user) {
      const u = user.toLowerCase();
      rows = rows.filter((r) => String(r.user).toLowerCase().includes(u));
    }
    const action = filters.action?.trim();
    if (action) rows = rows.filter((r) => String(r.action).includes(action));

    return {
      generatedAt: new Date().toISOString(),
      items: rows,
      total: rows.length,
    };
  }

  /** @todo Map to SOC / OSS audit feed (SSE/WebSocket gateway for telecom OSS). */
  return apiRequest("/security/logs");
}
