import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = (event) => {
    event.preventDefault();
    if (email && password) {
      navigate("/dashboard");
    }
  };

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

        <div>
          <label className="mb-2 block text-sm text-[#E5E7EB]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-[#E5E7EB]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3B82F6]/70"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          Continue
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
