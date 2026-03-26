"use client";

import { useState } from "react";
import Link from "next/link";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  promotions: boolean;
};

type FormErrors = Partial<Record<keyof FormData | "general", string>>;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",            test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    promotions: false,
  });

  const [errors, setErrors]     = useState<FormErrors>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" , general: "" }));
  };

  
  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim())  errs.lastName  = "Last name is required.";

    if (!form.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address.";
    }

    if (form.phone && !/^\+?[\d\s\-().]{7,15}$/.test(form.phone)) {
      errs.phone = "Please enter a valid phone number.";
    }

    const pwFails = PASSWORD_RULES.filter((r) => !r.test(form.password));
    if (form.password === "") {
      errs.password = "Password is required.";
    } else if (pwFails.length > 0) {
      errs.password = `Password must meet all requirements below.`;
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };


  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // this is where we need to connect to the backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          promotions: form.promotions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.message || "Registration failed. Please try again." });
        return;
      }

      setSuccess(true);
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  
  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-2xl text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-3xl font-bold uppercase tracking-wider mb-3">
            You&apos;re In!
          </h2>
          <p className="text-zinc-400 tracking-wide mb-2">
            Your account has been created successfully.
          </p>
          <p className="text-zinc-500 text-sm tracking-wide mb-6">
            A confirmation email has been sent to{" "}
            <span className="text-red-400">{form.email}</span>.
            Please verify your account before logging in.
          </p>
          <Link
            href="/login"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 px-8 rounded transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-2xl">

        <h2 className="text-3xl font-bold uppercase tracking-wider text-center mb-2">
          Create Account
        </h2>
        <p className="text-center text-zinc-500 text-sm tracking-wide mb-6">
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 hover:text-red-400 font-bold">
            Sign In
          </Link>
        </p>

        {/* General error */}
        {errors.general && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-5 text-sm tracking-wide text-center">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                  errors.firstName ? "border-red-500" : "border-zinc-700"
                }`}
                placeholder="Jane"
              />
              {errors.firstName && (
                <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                  errors.lastName ? "border-red-500" : "border-zinc-700"
                }`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                errors.email ? "border-red-500" : "border-zinc-700"
              }`}
              placeholder="jane@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Phone Number{" "}
              <span className="text-zinc-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                errors.phone ? "border-red-500" : "border-zinc-700"
              }`}
              placeholder="+1 (555) 000-0000"
            />
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                errors.password ? "border-red-500" : "border-zinc-700"
              }`}
              placeholder="Create a strong password"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
            {/* Password strength checklist */}
            {form.password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(form.password);
                  return (
                    <li
                      key={rule.label}
                      className={`text-xs tracking-wide flex items-center gap-1.5 ${
                        passed ? "text-green-400" : "text-zinc-500"
                      }`}
                    >
                      <span>{passed ? "✓" : "○"}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className={`w-full bg-zinc-900 border rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition ${
                errors.confirmPassword ? "border-red-500" : "border-zinc-700"
              }`}
              placeholder="Repeat your password"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Promotions */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.promotions}
              onChange={(e) => update("promotions", e.target.checked)}
              className="mt-1 accent-red-600 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm text-zinc-400 tracking-wide group-hover:text-zinc-300 transition">
              Send me promotions and special offers via email
            </span>
          </label>

          
          <p className="text-zinc-600 text-xs tracking-wide">
            Fields marked with <span className="text-red-500">*</span> are required.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-widest uppercase py-3 rounded transition mt-2"
          >
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

      </div>
    </div>
  );
}