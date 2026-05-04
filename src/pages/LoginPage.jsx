import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { AUTH_DEMO_ACCOUNTS_NOTICE } from "@/services/auth/authApi";

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
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#111827] p-8"
        noValidate
        aria-describedby="login-help"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6]/20">
            <Shield className="h-7 w-7 text-[#3B82F6]" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Access your CDSV dashboard</p>
        </div>

        <div className="space-y-1">
          <label className="mb-2 block text-sm text-[#E5E7EB]" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trimStart())}
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
          />
        </div>

        <div className="space-y-1">
          <label className="mb-2 block text-sm text-[#E5E7EB]" htmlFor="login-password">
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
              aria-invalid={password.length > 0 && !passwordValid}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 pr-11 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded-md"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#9CA3AF]">
          <input
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            type="checkbox"
            className="rounded border-white/20 bg-[#0F172A]"
          />
          Remember this device session
        </label>

        {error ? (
          <p className="text-sm text-[#FCA5A5]" role="alert">
            {error}
          </p>
        ) : null}

        <p id="login-help" className="text-xs text-[#6B7280]">
          {AUTH_DEMO_ACCOUNTS_NOTICE}
        </p>

        {!emailValid && email.length > 0 ? (
          <p className="text-xs text-[#F59E0B]" role="status">
            Email format looks invalid.
          </p>
        ) : null}
        {!passwordValid && password.length > 0 ? (
          <p className="text-xs text-[#F59E0B]" role="status">
            Password must be at least 8 characters.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !formValid}
          className="w-full rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] focus-visible:ring-[#38bdf8]"
        >
          {isSubmitting ? "Signing in…" : "Continue"}
        </button>

        <p className="text-center text-sm text-[#9CA3AF]">
          No account?{" "}
          <Link to="/register" className="text-[#60A5FA] hover:text-[#93C5FD] underline-offset-2 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
