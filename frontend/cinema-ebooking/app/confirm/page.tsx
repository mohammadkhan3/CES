"use client";

import Link from "next/link";

export default function ConfirmRegistrationPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-zinc-950 p-10 rounded-lg border border-zinc-800 text-center shadow-2xl">
        
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-green-600/20 p-4 rounded-full border border-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#22c55e" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-diplomata uppercase tracking-widest mb-4">
          Account Verified
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 tracking-wide">
          Your account has been successfully activated! You can now log in to book tickets and manage your favorites.
        </p>

        <Link 
          href="/login" 
          className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 rounded transition"
        >
          Proceed to Login
        </Link>
      </div>
    </div>
  );
}