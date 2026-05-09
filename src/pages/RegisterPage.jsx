import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Shield, UserPlus, Wifi, XCircle } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { normalizeEmail, isValidEmail } from "@/utils/validation";
import { sanitizePlainText } from "@/utils/sanitize";

const FIELDS = [
  { key: "fullName",        label: "Full name",        type: "text",     autoComplete: "name",         placeholder: "Jane Analyst" },
  { key: "email",           label: "Email address",    type: "email",    autoComplete: "email",        placeholder: "analyst@soc.company" },
  { key: "password",        label: "Password",         type: "password", autoComplete: "new-password", placeholder: "min 8 chars" },
  { key: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", placeholder: "repeat password" },
];

const SCORE_LABEL = ["—", "Weak", "Fair", "Good", "Strong"];
const SCORE_COLOR = ["bg-slate-700", "bg-rose-500", "bg-amber-500", "bg-sky-400", "bg-emerald-400"];

export default function RegisterPage() {
  const { register, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordScore =
    Number(form.password.length >= 8) +
    Number(/[A-Z]/.test(form.password)) +
    Number(/[0-9]/.test(form.password)) +
    Number(/[^A-Za-z0-9]/.test(form.password));

  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const redirectTarget = role === "admin" ? "/admin/dashboard" : "/user/dashboard";

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (passwordScore < 2) { setError("Password is too weak — add uppercase, numbers, or symbols."); return; }
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }

    setIsSubmitting(true);
    const result = await register({
      email,
      fullName: sanitizePlainText(form.fullName, 160),
      password: form.password,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Registration failed.");
      return;
    }
    navigate("/login", { replace: true });
  };

  if (isAuthenticated) return <Navigate to={redirectTarget} replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1a] p-4">
      {/* Background grid + radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.18), transparent 55%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "auto, 40px 40px, 40px 40px",
        }}
      />

      {/* Platform badge */}
      <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20">
          <Shield className="h-4 w-4 text-blue-400" aria-hidden />
        </div>
        <span className="text-[13px] font-semibold tracking-wide text-slate-300">
          CDSV Telecom Forensic Platform
        </span>
      </div>

      <div className="relative w-full max-w-[420px]">
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
          aria-hidden
          style={{ boxShadow: "0 0 0 1px rgba(37,99,235,0.25), 0 32px 80px -16px rgba(37,99,235,0.22)" }}
        />

        <form
          onSubmit={onSubmit}
          noValidate
          className="relative rounded-2xl border border-white/[0.08] bg-[#0d1629]/90 p-8 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-600/15 shadow-[0_0_32px_-8px_rgba(37,99,235,0.5)]">
              <UserPlus className="h-6 w-6 text-blue-400" aria-hidden />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-white">
              Create account
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              SOC analyst onboarding · secure registration
            </p>
          </div>

          {/* Status indicator */}
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3.5 py-2.5">
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <p className="text-[12px] text-emerald-300">
              Identity provisioning · encrypted credential storage
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3.5">
            {FIELDS.map(({ key, label, type, autoComplete, placeholder }) => (
              <div key={key}>
                <label
                  className="mb-1.5 block text-[13px] font-medium text-slate-300"
                  htmlFor={`reg-${key}`}
                >
                  {label}
                </label>
                <input
                  id={`reg-${key}`}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a1220] px-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
          </div>

          {/* Password strength */}
          {form.password.length > 0 && (
            <div className="mt-3.5 rounded-xl border border-white/[0.06] bg-[#0a1220] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 uppercase tracking-wide">Password strength</span>
                <span className={`font-semibold ${passwordScore <= 1 ? "text-rose-400" : passwordScore <= 2 ? "text-amber-400" : "text-emerald-400"}`}>
                  {SCORE_LABEL[passwordScore]}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordScore >= n ? SCORE_COLOR[Math.min(passwordScore, 4)] : "bg-white/10"}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Password match indicator */}
          {form.confirmPassword.length > 0 && (
            <div className="mt-2 text-[12px]">
              {passwordsMatch ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Passwords match
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-400" role="status">
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  Passwords do not match
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error ? (
            <div
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-2.5"
              role="alert"
            >
              <p className="text-[13px] text-rose-300">{error}</p>
            </div>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-[14px] font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1629]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating account…
              </span>
            ) : (
              "Create secure account"
            )}
          </button>

          <p className="mt-5 text-center text-[12px] text-slate-600">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-blue-400 underline-offset-2 transition hover:text-blue-300 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-slate-700">
          AES-256-GCM · SHA-256 · TLS 1.3
        </p>
      </div>
    </div>
  );
}
