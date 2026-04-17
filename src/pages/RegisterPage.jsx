import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const onSubmit = (event) => {
    event.preventDefault();
    navigate("/dashboard");
  };

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
          ["name", "Full name", "text"],
          ["email", "Email", "email"],
          ["password", "Password", "password"],
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

        <button
          type="submit"
          className="w-full rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          Create account
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
