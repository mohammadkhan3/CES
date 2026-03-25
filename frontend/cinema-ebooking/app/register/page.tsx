"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoOptIn, setPromoOptIn] = useState(false);


  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

const handleRegister = (e: React.SyntheticEvent) => {    setError("");
    setSuccess("");


    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Hand off to Flask backend HERE
    console.log("Sending to backend:", { firstName, lastName, email, password, promoOptIn });
    
    // Prototype Success Message 
    setSuccess("Account successfully created! Please check your email for a confirmation link to activate your account.");
    
    // Clear the form
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-zinc-950 p-8 rounded-lg border border-zinc-800 shadow-2xl">
        
        <h2 className="text-3xl font-diplomata uppercase tracking-wider text-center mb-6">
          Create Account
        </h2>

        {/* Error / Success Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-6 text-sm tracking-wide text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded mb-6 text-sm tracking-wide text-center leading-relaxed">
            {success}
          </div>
        )}

        {/* The Registration Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold tracking-widest text-zinc-400 mb-2 uppercase">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-zinc-400 mb-2 uppercase">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest text-zinc-400 mb-2 uppercase">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
              placeholder="user@example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold tracking-widest text-zinc-400 mb-2 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-zinc-400 mb-2 uppercase">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-red-600 transition"
                placeholder="Re-type password"
              />
            </div>
          </div>

          {/* Promotions Checkbox */}
          <div className="flex items-start gap-3 mt-4 bg-zinc-900/50 p-4 rounded border border-zinc-800">
            <input
              type="checkbox"
              id="promo"
              checked={promoOptIn}
              onChange={(e) => setPromoOptIn(e.target.checked)}
              className="mt-1 w-4 h-4 accent-red-600"
            />
            <label htmlFor="promo" className="text-sm text-zinc-400 leading-relaxed cursor-pointer">
              I would like to receive promotional emails, exclusive offers, and the latest cinema news.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-4 rounded transition mt-6"
          >
            Create Account
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-zinc-400 tracking-wide border-t border-zinc-800 pt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-red-500 hover:text-red-400 font-bold">
            Sign In Here
          </Link>
        </div>

      </div>
    </div>
  );
}