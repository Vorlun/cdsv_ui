/**
 * Central navigation configuration for telecom SOC console shell.
 * Icons are component references (Lucide) — keep serializable metadata here, not instances.
 */

import {
  LayoutDashboard,
  Users,
  ScrollText,
  ShieldAlert,
  UploadCloud,
  Settings,
  FolderKanban,
  ShieldCheck,
  UserCircle2,
  Radio,
  BarChart3,
  Brain,
  FileText,
  Server,
  Bell,
  Shield,
} from "lucide-react";
import { matchPath } from "react-router-dom";

/** @typedef {'admin'|'user'} ConsoleRole */

/** @typedef {{ id: string, label: string, path: string, icon: React.ComponentType<{className?: string}> }} NavItem */

/** @typedef {{ id: string, title: string, items: NavItem[] }} NavSection */

/** @type {readonly NavSection[]} */
export const ADMIN_NAV_SECTIONS = Object.freeze([
  {
    id: "admin-core",
    title: "Core",
    items: Object.freeze([
      { id: "admin-dashboard", label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { id: "admin-users", label: "User Management", path: "/admin/users", icon: Users },
    ]),
  },
  {
    id: "admin-operations",
    title: "Operations",
    items: Object.freeze([
      { id: "admin-telemetry", label: "Telemetry Control", path: "/admin/telemetry", icon: Radio },
      { id: "admin-uploads", label: "Upload Monitoring", path: "/admin/uploads", icon: UploadCloud },
      { id: "admin-security", label: "Security Center", path: "/admin/security", icon: Shield },
      { id: "admin-threats", label: "Threat Detection", path: "/admin/threats", icon: ShieldAlert },
      { id: "admin-ai", label: "AI Monitoring", path: "/admin/ai", icon: Brain },
      { id: "admin-analytics", label: "System Analytics", path: "/admin/analytics", icon: BarChart3 },
    ]),
  },
  {
    id: "admin-platform",
    title: "Platform",
    items: Object.freeze([
      { id: "admin-logs", label: "Logs Center", path: "/admin/logs", icon: ScrollText },
      { id: "admin-reports", label: "Reports", path: "/admin/reports", icon: FileText },
      { id: "admin-infrastructure", label: "Infrastructure", path: "/admin/infrastructure", icon: Server },
      { id: "admin-notifications", label: "Notifications", path: "/admin/notifications", icon: Bell },
      { id: "admin-settings", label: "Settings", path: "/admin/settings", icon: Settings },
    ]),
  },
]);

/** @type {readonly NavSection[]} */
export const USER_NAV_SECTIONS = Object.freeze([
  {
    id: "user-workspace",
    title: "Workspace",
    items: Object.freeze([
      { id: "user-dashboard", label: "Dashboard", path: "/user/dashboard", icon: LayoutDashboard },
      { id: "user-upload", label: "Upload File", path: "/user/upload", icon: UploadCloud },
      { id: "user-files", label: "My Files", path: "/user/files", icon: FolderKanban },
      { id: "user-security", label: "Security Status", path: "/user/security", icon: ShieldCheck },
      { id: "user-profile", label: "Profile", path: "/user/profile", icon: UserCircle2 },
      { id: "user-settings", label: "Settings", path: "/user/settings", icon: Settings },
    ]),
  },
]);

/** @param {ConsoleRole} role */
export function getNavSectionsForRole(role) {
  if (role === "admin") return ADMIN_NAV_SECTIONS;
  return USER_NAV_SECTIONS;
}

/**
 * Resolve the most specific matching nav item for highlight + page title.
 * Longer paths win over shorter prefixes.
 * @param {string} pathname
 * @param {ConsoleRole} role
 * @returns {{ section: NavSection, item: NavItem } | null}
 */
export function resolveActiveNavContext(pathname, role) {
  const sections = [...getNavSectionsForRole(role)];
  /** @type {{ section: NavSection, item: NavItem, specificity: number } | null} */
  let best = null;
  for (const section of sections) {
    for (const item of section.items) {
      const match = matchPath({ path: item.path, end: true }, pathname);
      if (match) {
        const specificity = item.path.length;
        if (!best || specificity > best.specificity) {
          best = { section, item, specificity };
        }
      }
    }
  }
  return best ? { section: best.section, item: best.item } : null;
}

/**
 * Human-readable page title for top bar.
 * @param {string} pathname
 * @param {ConsoleRole} role
 */
export function resolvePageTitle(pathname, role) {
  const ctx = resolveActiveNavContext(pathname, role);
  if (ctx) return ctx.item.label;
  return role === "admin" ? "Admin Panel" : "User Workspace";
}
