/**
 * Deterministic SOC-style posture score derived from observable signals (simulated IAM).
 * @param {{ status?: string, failedLogins?: number, ips?: unknown[], uploads?: number }} user
 */
export function computeSecurityScore(user) {
  let s = 100;
  s -= Math.min((Number(user?.failedLogins) || 0) * 4, 44);
  if (user?.status === "Suspended") s -= 14;
  const ips = Array.isArray(user?.ips) ? user.ips.length : 0;
  s -= Math.max(0, ips - 3) * 2;
  const uploads = Number(user?.uploads) || 0;
  s -= uploads > 800 ? 6 : uploads < 50 ? 2 : 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}
