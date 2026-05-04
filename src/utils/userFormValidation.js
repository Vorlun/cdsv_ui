import { sanitizePlainText } from "@/utils/sanitize";
import { APP_ROLES, canAssignAppRole, callerRankFromAuthRole, canChangeTargetRole } from "@/utils/rolePolicy";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * @param {string} password
 * @returns {{ ok: boolean, code: string }}
 */
export function validatePasswordPolicy(password) {
  const p = String(password ?? "");
  if (p.length < 10) return { ok: false, code: "minLength" };
  if (!/[A-Z]/.test(p)) return { ok: false, code: "upper" };
  if (!/[a-z]/.test(p)) return { ok: false, code: "lower" };
  if (!/[0-9]/.test(p)) return { ok: false, code: "digit" };
  if (!/[^A-Za-z0-9]/.test(p)) return { ok: false, code: "symbol" };
  return { ok: true, code: "" };
}

export function passwordPolicyMessage(code) {
  switch (code) {
    case "minLength":
      return "At least 10 characters required.";
    case "upper":
      return "Add an uppercase letter.";
    case "lower":
      return "Add a lowercase letter.";
    case "digit":
      return "Add a digit.";
    case "symbol":
      return "Add a symbol (e.g. !@#$%).";
    default:
      return "Password does not meet policy.";
  }
}

/**
 * @param {string} email
 */
export function validateEmailFormat(email) {
  const e = String(email ?? "").trim();
  if (!e) return { ok: false, message: "Email is required." };
  if (e.length > 254) return { ok: false, message: "Email is too long." };
  if (!EMAIL_RE.test(e)) return { ok: false, message: "Enter a valid email address." };
  return { ok: true, message: "" };
}

/**
 * @param {object} form
 * @param {{ mode: 'create'|'edit', passwordRequired: boolean, authRole?: string | null, targetCurrentRole?: string }} ctx
 * @returns {Record<string, string>}
 */
export function validateUserForm(form, ctx) {
  const errors = {};
  const name = sanitizePlainText(String(form.fullName ?? ""), 200).trim();
  if (!name) errors.fullName = "Full name is required.";

  const emailResult = validateEmailFormat(form.email);
  if (!emailResult.ok) errors.email = emailResult.message;

  const role = String(form.role ?? "");
  if (!APP_ROLES.includes(role)) errors.role = "Select a valid role.";

  const status = String(form.status ?? "");
  if (status !== "Active" && status !== "Suspended") errors.status = "Invalid status.";

  const devices = Number(form.allowedDevices ?? 0);
  if (!Number.isFinite(devices) || devices < 1 || devices > 99) {
    errors.allowedDevices = "Allowed devices must be between 1 and 99.";
  }

  const pwd = String(form.password ?? "");
  if (ctx.passwordRequired || pwd.length > 0) {
    const pol = validatePasswordPolicy(pwd);
    if (!pol.ok) errors.password = passwordPolicyMessage(pol.code);
  }

  const callerR = callerRankFromAuthRole(ctx.authRole);
  if (ctx.authRole !== "admin") {
    if (role && role !== "User" && role !== "Viewer") {
      errors.role = "Only an administrator may assign this role.";
    }
  } else if (ctx.targetCurrentRole && role) {
    if (!canChangeTargetRole(callerR, ctx.targetCurrentRole, role)) {
      errors.role = "Role change exceeds your authority (privilege policy).";
    }
  } else if (role && !canAssignAppRole(callerR, role)) {
    errors.role = "You cannot assign this role.";
  }

  return errors;
}

/**
 * Live field validation (partial) for inline feedback.
 * @param {string} field
 * @param {unknown} value
 * @param {object} form
 * @param {{ mode: 'create'|'edit', authRole?: string | null, editingUser?: { role?: string } | null }} ctx
 */
export function validateUserField(field, value, form, ctx) {
  const next = { ...form, [field]: value };
  const full = validateUserForm(next, {
    mode: ctx.mode,
    passwordRequired: ctx.mode === "create",
    authRole: ctx.authRole,
    targetCurrentRole: ctx.editingUser?.role,
  });
  return full[field] ?? "";
}
