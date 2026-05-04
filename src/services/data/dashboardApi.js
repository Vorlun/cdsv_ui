/**
 * Normalized SOC dashboard payloads — fetched async to mirror OSS/BSS gateways.
 */

import { env } from "@/config/env";
import { delay } from "@/utils/delay";
import { apiRequest } from "@/services/api/apiRequest";

const METRIC_DEFINITIONS = [
  {
    key: "users",
    label: "Total Users",
    value: 1284,
    trend: "+12%",
    iconKey: "users",
    iconColor: "text-[#60A5FA]",
    borderGlow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]",
    spark: [20, 24, 28, 27, 30, 34, 36],
  },
  {
    key: "uploads",
    label: "Total Uploads",
    value: 9742,
    trend: "+8%",
    iconKey: "upload",
    iconColor: "text-[#34D399]",
    borderGlow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]",
    spark: [12, 13, 17, 18, 19, 22, 24],
  },
  {
    key: "failed",
    label: "Failed Logins",
    value: 83,
    trend: "-3%",
    iconKey: "user-x",
    iconColor: "text-[#FCD34D]",
    borderGlow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]",
    spark: [14, 13, 12, 12, 10, 9, 8],
  },
  {
    key: "blocked",
    label: "Blocked IPs",
    value: 27,
    trend: "+6%",
    iconKey: "ban",
    iconColor: "text-[#F87171]",
    borderGlow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.35)]",
    spark: [6, 8, 7, 9, 10, 11, 13],
    dynamicSource: "blockedIpsLength",
  },
  {
    key: "threats",
    label: "Threat Alerts",
    value: 12,
    trend: "+2%",
    iconKey: "shield-alert",
    iconColor: "text-[#C084FC]",
    borderGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]",
    spark: [4, 5, 7, 7, 8, 9, 10],
    dynamicSource: "openThreatCount",
  },
];

const CHART_SERIES = Object.freeze({
  daily: {
    loginAttempts: [
      { time: "00:00", attempts: 120 },
      { time: "04:00", attempts: 92 },
      { time: "08:00", attempts: 230 },
      { time: "12:00", attempts: 310 },
      { time: "16:00", attempts: 268 },
      { time: "20:00", attempts: 190 },
    ],
    uploadsThreats: [
      { label: "Mon", uploads: 320, threats: 18 },
      { label: "Tue", uploads: 420, threats: 22 },
      { label: "Wed", uploads: 390, threats: 17 },
      { label: "Thu", uploads: 460, threats: 25 },
      { label: "Fri", uploads: 510, threats: 28 },
      { label: "Sat", uploads: 280, threats: 11 },
      { label: "Sun", uploads: 260, threats: 9 },
    ],
  },
  weekly: {
    loginAttempts: [
      { time: "W1", attempts: 1060 },
      { time: "W2", attempts: 1220 },
      { time: "W3", attempts: 1410 },
      { time: "W4", attempts: 1340 },
    ],
    uploadsThreats: [
      { label: "W1", uploads: 2020, threats: 96 },
      { label: "W2", uploads: 2290, threats: 121 },
      { label: "W3", uploads: 2410, threats: 107 },
      { label: "W4", uploads: 2540, threats: 119 },
    ],
  },
  monthly: {
    loginAttempts: [
      { time: "Jan", attempts: 4020 },
      { time: "Feb", attempts: 4210 },
      { time: "Mar", attempts: 4480 },
      { time: "Apr", attempts: 4630 },
      { time: "May", attempts: 4870 },
      { time: "Jun", attempts: 4790 },
    ],
    uploadsThreats: [
      { label: "Jan", uploads: 9200, threats: 380 },
      { label: "Feb", uploads: 9850, threats: 421 },
      { label: "Mar", uploads: 10120, threats: 405 },
      { label: "Apr", uploads: 10790, threats: 438 },
      { label: "May", uploads: 11040, threats: 462 },
      { label: "Jun", uploads: 10880, threats: 447 },
    ],
  },
});

const THREAT_DISTRIBUTION = Object.freeze([
  { name: "Malware Uploads", percent: 32, count: 128, color: "#EF4444" },
  { name: "Suspicious Logins", percent: 25, count: 97, color: "#F59E0B" },
  { name: "API Abuse Attempts", percent: 23, count: 89, color: "#3B82F6" },
  { name: "Blocked Requests", percent: 20, count: 76, color: "#10B981" },
]);

const INITIAL_THREATS = Object.freeze([
  { id: "A1", message: "Brute force attempt detected", severity: "Critical", ago: "1m ago", dismissed: false },
  { id: "A2", message: "Suspicious login from new country", severity: "High", ago: "4m ago", dismissed: false },
  { id: "A3", message: "Too many failed requests", severity: "Medium", ago: "9m ago", dismissed: false },
  { id: "A4", message: "Unauthorized API access blocked", severity: "High", ago: "12m ago", dismissed: false },
]);

const INITIAL_LOGS = Object.freeze([
  {
    id: "L1",
    time: "09:10",
    user: "Admin Operator",
    email: "admin@test.com",
    ip: "10.1.1.20",
    action: "Login",
    result: "Success",
  },
  {
    id: "L2",
    time: "09:34",
    user: "User Analyst",
    email: "user@test.com",
    ip: "10.1.1.34",
    action: "Upload",
    result: "Success",
  },
  {
    id: "L3",
    time: "10:05",
    user: "Unknown",
    email: "-",
    ip: "185.23.11.92",
    action: "Login",
    result: "Blocked",
  },
  {
    id: "L4",
    time: "10:18",
    user: "SOC Viewer",
    email: "soc.viewer@test.com",
    ip: "192.168.4.20",
    action: "Export",
    result: "Success",
  },
  {
    id: "L5",
    time: "10:40",
    user: "Unknown",
    email: "-",
    ip: "91.80.27.9",
    action: "API Probe",
    result: "Blocked",
  },
  {
    id: "L6",
    time: "11:12",
    user: "User Analyst",
    email: "user@test.com",
    ip: "10.1.1.34",
    action: "Delete",
    result: "Denied",
  },
]);

function normalizeSnapshot(payload) {
  return {
    generatedAt: new Date().toISOString(),
    metricDefinitions: payload.metricDefinitions.map((row) => ({ ...row })),
    chartRanges: payload.chartRanges,
    threatDistribution: payload.threatDistribution.map((row) => ({ ...row })),
    threats: payload.threats.map((row) => ({ ...row })),
    logs: payload.logs.map((row) => ({ ...row, id: row.id ?? `row_${row.ip}_${row.time}` })),
    healthScore: payload.healthScore,
    activeSessions: payload.activeSessions,
    adminOperators: [...payload.adminOperators],
    blockedIpSeeds: [...payload.blockedIpSeeds],
    scanStages: [...payload.scanStages],
  };
}

async function fetchMockDashboard() {
  await delay(320 + Math.random() * 200);
  return normalizeSnapshot({
    metricDefinitions: METRIC_DEFINITIONS.map((m) => ({ ...m })),
    chartRanges: CHART_SERIES,
    threatDistribution: THREAT_DISTRIBUTION.map((row) => ({ ...row })),
    threats: INITIAL_THREATS.map((row) => ({ ...row })),
    logs: INITIAL_LOGS.map((row) => ({ ...row })),
    healthScore: 92,
    activeSessions: 214,
    adminOperators: ["Admin Operator", "SOC Viewer", "User Analyst"],
    blockedIpSeeds: ["185.23.11.92", "91.80.27.9"],
    scanStages: [
      "Checking active sessions...",
      "Inspecting suspicious IP traffic...",
      "Verifying token abuse patterns...",
      "Scanning uploads...",
      "Finalizing report...",
    ],
  });
}

/** @todo Map VITE_USE_MOCK_API=false to OSS gateway contract */
export async function fetchAdminDashboardSnapshot() {
  if (env.useMockApi) {
    return fetchMockDashboard();
  }
  return apiRequest("/soc/admin/dashboard/overview");
}

export { METRIC_DEFINITIONS };
