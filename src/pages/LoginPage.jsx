import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  const passwordValid = password.length >= 6;
  const formValid = emailValid && passwordValid;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!formValid) {
      setError("Please provide a valid email and password (minimum 8 characters).");
      return;
    }
    setIsSubmitting(true);
    const result = await login({ email, password });
    if (!result.ok) {
      setIsSubmitting(false);
      setError(result.error);
      return;
    }
    if (rememberMe) {
      window.localStorage.setItem("cdsv-role", result.role);
    }
    navigate(result.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
  };

  if (isAuthenticated) {
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/user/dashboard"} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#111827] p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6]/20">
            <Shield className="h-7 w-7 text-[#3B82F6]" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Access your CDSV dashboard</p>
        </div>

        <div className="space-y-1">
          <label className="mb-2 block text-sm text-[#E5E7EB]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
          />
        </div>

        <div className="space-y-1">
          <label className="mb-2 block text-sm text-[#E5E7EB]">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 pr-11 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
          Remember me
        </label>

        {error && <p className="text-sm text-[#FCA5A5]">{error}</p>}

        {!error && (
          <p className="text-xs text-[#6B7280]">
            Demo users: admin@test.com / 123456 and user@test.com / 123456
          </p>
        )}

        {!emailValid && email.length > 0 && (
          <p className="text-xs text-[#F59E0B]">Email format looks invalid.</p>
        )}
        {!passwordValid && password.length > 0 && (
          <p className="text-xs text-[#F59E0B]">Password should be at least 8 characters.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !formValid}
          className="w-full rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Continue"}
        </button>

        <p className="text-center text-sm text-[#9CA3AF]">
          No account?{" "}
          <Link to="/register" className="text-[#60A5FA] hover:text-[#93C5FD]">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
