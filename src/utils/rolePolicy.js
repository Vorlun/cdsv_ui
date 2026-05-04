/** Application roles (telecom IAM console). */
export const APP_ROLES = Object.freeze(["Admin", "Analyst", "Viewer", "User"]);

/** Higher number = more privilege. */
export const ROLE_RANK = Object.freeze({
  Admin: 4,
  Analyst: 3,
  Viewer: 2,
  User: 1,
});

/**
 * @param {string} role
 * @returns {number}
 */
export function roleRank(role) {
  return ROLE_RANK[role] ?? 0;
}

/**
 * Auth session uses `admin` | `user`. Map to worst-case app rank for non-admin auth users.
 * @param {string | null | undefined} authRole
 * @returns {number}
 */
export function callerRankFromAuthRole(authRole) {
  if (authRole === "admin") return ROLE_RANK.Admin;
  return ROLE_RANK.User;
}

/**
 * Only callers at or above the new role rank may assign that role.
 * @param {number} callerRank
 * @param {string} nextRole
 */
export function canAssignAppRole(callerRank, nextRole) {
  const next = roleRank(nextRole);
  if (!next) return false;
  return callerRank >= next;
}

/**
 * Escalation: assigning a role strictly higher than the target's current role
 * requires caller rank strictly greater than the new role (break-glass: only super-admin pattern).
 * Here we use: caller must be >= new role AND caller must be >= target's current role
 * (admin can promote Analyst → Admin; admin can demote Admin → User).
 * @param {number} callerRank
 * @param {string} targetCurrentRole
 * @param {string} nextRole
 */
export function canChangeTargetRole(callerRank, targetCurrentRole, nextRole) {
  if (!canAssignAppRole(callerRank, nextRole)) return false;
  const currentR = roleRank(targetCurrentRole);
  const nextR = roleRank(nextRole);
  if (nextR > currentR && callerRank < nextR) return false;
  return callerRank >= Math.max(currentR, nextR);
}

/**
 * @param {{ role: string }[]} users
 * @param {string} [ignoreId] user id excluded from count (e.g. being demoted)
 */
export function countAdmins(users, ignoreId) {
  return users.filter((u) => u.role === "Admin" && u.id !== ignoreId).length;
}
