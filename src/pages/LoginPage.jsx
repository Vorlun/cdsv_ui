import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Shield, Wifi } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const passwordValid = password.length >= 8;
  const formValid = emailValid && passwordValid;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!formValid) {
      setError("Please provide a valid email and password (minimum 8 characters).");
      return;
    }
    setIsSubmitting(true);
    const result = await login({ email, password, rememberMe });
    if (!result.ok) {
      setIsSubmitting(false);
      setError(result.error);
      return;
    }
    navigate(result.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
  };

  if (isAuthenticated) {
    return (
      <Navigate to={role === "admin" ? "/admin/dashboard" : "/user/dashboard"} replace />
    );
  }

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

      {/* Platform badge — top center */}
      <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20">
          <Shield className="h-4 w-4 text-blue-400" aria-hidden />
        </div>
        <span className="text-[13px] font-semibold tracking-wide text-slate-300">
          CDSV Telecom Forensic Platform
        </span>
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Outer glow ring */}
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
          aria-hidden
          style={{ boxShadow: "0 0 0 1px rgba(37,99,235,0.25), 0 32px 80px -16px rgba(37,99,235,0.22)" }}
        />

        <form
          onSubmit={onSubmit}
          noValidate
          aria-describedby="login-help"
          className="relative rounded-2xl border border-white/[0.08] bg-[#0d1629]/90 p-8 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-600/15 shadow-[0_0_32px_-8px_rgba(37,99,235,0.5)]">
              <Lock className="h-6 w-6 text-blue-400" aria-hidden />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-white">
              Authenticate
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              SOC operator access · secure session
            </p>
          </div>

          {/* Status indicator */}
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3.5 py-2.5">
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <p className="text-[12px] text-emerald-300">
              Relay mesh active · TLS 1.3 · encrypted session channel
            </p>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label
              className="mb-1.5 block text-[13px] font-medium text-slate-300"
              htmlFor="login-email"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.trimStart())}
              placeholder="analyst@soc.company"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a1220] px-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
            />
            {!emailValid && email.length > 2 && (
              <p className="mt-1 text-[11px] text-amber-400" role="status">
                Invalid email format
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label
              className="mb-1.5 block text-[13px] font-medium text-slate-300"
              htmlFor="login-password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                aria-invalid={password.length > 0 && !passwordValid}
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0a1220] px-3.5 pr-10 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-slate-500 transition hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {/* Remember */}
          <label className="mb-5 flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-400">
            <input
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-white/20 bg-[#0a1220] accent-blue-500"
            />
            Remember this device session
          </label>

          {/* Error */}
          {error ? (
            <div
              className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3.5 py-2.5"
              role="alert"
            >
              <p className="text-[13px] text-rose-300">{error}</p>
            </div>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !formValid}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-[14px] font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1629]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Authenticating…
              </span>
            ) : (
              "Sign in to workspace"
            )}
          </button>

          <p id="login-help" className="mt-5 text-center text-[12px] text-slate-600">
            No account?{" "}
            <Link
              to="/register"
              className="text-blue-400 underline-offset-2 transition hover:text-blue-300 hover:underline"
            >
              Request access
            </Link>
          </p>
        </form>

        {/* Footer badge */}
        <p className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-slate-700">
          AES-256-GCM · SHA-256 · TLS 1.3
        </p>
      </div>
    </div>
  );
}
