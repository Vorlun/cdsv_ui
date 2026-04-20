import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordScore =
    Number(form.password.length >= 8) +
    Number(/[A-Z]/.test(form.password)) +
    Number(/[0-9]/.test(form.password)) +
    Number(/[^A-Za-z0-9]/.test(form.password));
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordScore < 2) {
      setError("Password strength is too weak.");
      return;
    }
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    register({ email: form.email, fullName: form.fullName || "New User" });
    navigate("/dashboard");
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#111827] p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#3B82F6]/20">
            <UserPlus className="h-7 w-7 text-[#3B82F6]" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Create account</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Secure onboarding in under a minute</p>
        </div>

        {[
          ["fullName", "Full name", "text"],
          ["email", "Email", "email"],
          ["password", "Password", "password"],
          ["confirmPassword", "Confirm password", "password"],
        ].map(([key, label, type]) => (
          <div key={key}>
            <label className="mb-2 block text-sm text-[#E5E7EB]">{label}</label>
            <input
              type={type}
              required
              value={form[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
            />
          </div>
        ))}

        <div className="rounded-xl border border-white/10 bg-[#0F172A] p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Password Strength</span>
            <span>{passwordScore <= 1 ? "Weak" : passwordScore <= 2 ? "Medium" : "Strong"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all ${
                passwordScore <= 1
                  ? "bg-[#EF4444]"
                  : passwordScore <= 2
                    ? "bg-[#F59E0B]"
                    : "bg-[#10B981]"
              }`}
              style={{ width: `${Math.min((passwordScore / 4) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="text-xs">
          {passwordsMatch ? (
            <span className="inline-flex items-center gap-1 text-[#10B981]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Passwords match
            </span>
          ) : form.confirmPassword.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[#EF4444]">
              <XCircle className="h-3.5 w-3.5" />
              Passwords do not match
            </span>
          ) : null}
        </div>

        {error && <p className="text-sm text-[#FCA5A5]">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-[#9CA3AF]">
          Already registered?{" "}
          <Link to="/login" className="text-[#60A5FA] hover:text-[#93C5FD]">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
