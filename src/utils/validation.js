const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

/** @param {string} password */
export function isPasswordStrengthOkForRegister(password) {
  let score =
    Number(password.length >= 8) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  return score >= 2;
}

/**
 * Progressive strength meter for signup / profile password UX (SOC policy aligned with {@link isPasswordStrengthOkForRegister}).
 * @param {string} password
 * @returns {{ score: number, max: 4, label: string, meetsPolicy: boolean, hints: string[] }}
 */
export function estimatePasswordStrength(password) {
  const p = String(password ?? "");
  const hints = [];
  if (!p.length) {
    return { score: 0, max: 4, label: "Enter a password", meetsPolicy: false, hints };
  }

  let score = 0;
  if (p.length >= 8) {
    score++;
  } else {
    hints.push("At least 8 characters.");
  }

  let classes = 0;
  if (/[A-Z]/.test(p)) classes++;
  else hints.push("Add an uppercase letter.");
  if (/[a-z]/.test(p)) classes++;
  else hints.push("Add a lowercase letter.");
  if (/[0-9]/.test(p)) classes++;
  else hints.push("Add a number.");
  if (/[^A-Za-z0-9]/.test(p)) classes++;
  else hints.push("Add a symbol.");

  /** Require length + entropy from multiple classes (maps to tier 3–4) */
  if (p.length >= 10) score++;
  const classScore = classes >= 3 ? 2 : classes >= 2 ? 1 : 0;
  score += classScore;

  score = Math.min(score, 4);
  const meetsPolicy = isPasswordStrengthOkForRegister(p);

  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  return {
    score,
    max: 4,
    label,
    meetsPolicy,
    hints: hints.slice(0, 3),
  };
}

/** @param {string} password */
export function isPasswordStrongEnoughLogin(password) {
  return typeof password === "string" && password.length >= 8;
}
