"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ConfirmRegistrationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid confirmation link.");
      return;
    }

    fetch(`/api/auth/confirm?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.message || "Confirmation failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400 tracking-widest uppercase">Verifying your account...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-950 p-10 rounded-lg border border-zinc-800 text-center shadow-2xl">
          <h1 className="text-3xl font-diplomata uppercase tracking-widest mb-4 text-red-500">
            Verification Failed
          </h1>
          <p className="text-zinc-400 text-sm mb-8">{message}</p>
          <Link href="/register" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 rounded transition">
            Back to Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-zinc-950 p-10 rounded-lg border border-zinc-800 text-center shadow-2xl">
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
        <Link href="/login" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 rounded transition">
          Proceed to Login
        </Link>
      </div>
    </div>
  );
}