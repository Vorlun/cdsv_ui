import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111827] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-[#60A5FA]">404</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">
          The requested route does not exist in CDSV navigation.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
