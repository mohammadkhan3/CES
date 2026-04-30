"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",            test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [loading,         setLoading]         = useState(false);

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    if (!allRulesPassed) {
      setError("Password does not meet the requirements below.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password. Please try again.");
        return;
      }

      setSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-2xl">

        <h2 className="text-3xl font-diplomata uppercase tracking-wider text-center mb-6">
          New Password
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm tracking-wide text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded mb-4 text-sm tracking-wide text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
              placeholder="Enter new password"
            />
            {newPassword && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.label}
                    className={`text-xs flex items-center gap-1 ${
                      rule.test(newPassword) ? "text-green-400" : "text-zinc-500"
                    }`}
                  >
                    <span>{rule.test(newPassword) ? "✓" : "○"}</span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold tracking-widest uppercase py-3 rounded transition mt-4"
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          <Link href="/login" className="hover:text-white transition tracking-wide">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
