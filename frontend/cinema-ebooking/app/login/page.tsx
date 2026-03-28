"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  

  const [view, setView] = useState<"login" | "forgot">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Updated standard login
  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
  
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }
  
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        return;
      }
  
      localStorage.setItem("user", JSON.stringify(data.data));
  
      if (data.data.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  // Updated forgot password request
  const handleForgotPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
  
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
  
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
  
      const data = await res.json();
      setSuccess(data.message || "If an account exists, a reset link has been sent!");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-2xl">
        
        <h2 className="text-3xl font-diplomata uppercase tracking-wider text-center mb-6">
          {view === "login" ? "Welcome Back" : "Reset Password"}
        </h2>

        {/* Error / Success Messages */}
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

        {/* The Form */}
        <form onSubmit={view === "login" ? handleLogin : handleForgotPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
              placeholder="Enter your email"
            />
          </div>

          {view === "login" && (
            <div>
              <label className="block text-sm font-bold tracking-widest text-zinc-400 mb-2 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                placeholder="Enter your password"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 rounded transition mt-4"
          >
            {view === "login" ? "Sign In" : "Send Reset Link"}
          </button>
        </form>

        {/* Form Footer Links */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-zinc-400">
          {view === "login" ? (
            <button 
              onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
              className="hover:text-white transition tracking-wide"
            >
              Forgot your password?
            </button>
          ) : (
            <button 
              onClick={() => { setView("login"); setError(""); setSuccess(""); }}
              className="hover:text-white transition tracking-wide"
            >
              Back to Login
            </button>
          )}

          <div className="tracking-wide">
            Don't have an account?{" "}
            <Link href="/register" className="text-red-500 hover:text-red-400 font-bold">
              Sign Up
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}