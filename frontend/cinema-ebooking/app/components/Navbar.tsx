"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [genre, setGenre] = useState(sp.get("genre") ?? "All Genres");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setGenre(sp.get("genre") ?? "All Genres");
  }, [sp]);

  const pushUrl = (nextQ: string, nextGenre: string) => {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextGenre !== "All Genres") params.set("genre", nextGenre);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const onGo = () => pushUrl(q, genre);
  const onClear = () => {
    setQ("");
    setGenre("All Genres");
    router.push("/");
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    setIsLoggedIn(!!token);
    setIsAdmin(role === "admin");
  }, []);

  const handleLogout = () => setShowConfirm(true);

  const confirmLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "session=; Max-Age=0; path=/";

    setIsLoggedIn(false);
    setIsAdmin(false);
    setShowConfirm(false);
    router.push("/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-black border-b border-zinc-800 px-6 py-4 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <Image src="/favicon.ico" alt="CES Logo" width={32} height={32} />
            <span className="font-diplomata text-2xl tracking-tight">CES</span>
          </Link>

          <div className="flex-1 max-w-md w-full flex gap-2">
            <input
              type="text"
              placeholder="Search movies by title..."
              value={q}
              onChange={(e) => {
                const val = e.target.value;
                setQ(val);
                if (val.trim() === "") pushUrl("", genre);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") onGo(); }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-red-600 transition"
            />
            <button
              type="button"
              onClick={onGo}
              className="bg-zinc-900 border border-zinc-700 rounded-md px-4 py-2 text-xs uppercase tracking-widest hover:border-red-600 transition"
            >
              Go
            </button>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={genre}
              onChange={(e) => {
                const nextGenre = e.target.value;
                setGenre(nextGenre);
                pushUrl(q, nextGenre);
              }}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs uppercase tracking-widest"
            >
              <option>All Genres</option>
              <option>Action</option>
              <option>Adventure</option>
              <option>Comedy</option>
              <option>Drama</option>
              <option>Horror</option>
              <option>Romance</option>
            </select>

            <input
              type="date"
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs uppercase"
            />

            <button
              type="button"
              onClick={onClear}
              className="text-xs uppercase tracking-widest hover:text-red-600 transition"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-6 ml-4">
            {isLoggedIn ? (
              <>
                <Link href="/profile" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
                  Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs uppercase tracking-widest hover:text-red-600 transition"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
                  Login
                </Link>
                <Link href="/register" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-xs font-bold uppercase transition">
                  Sign Up
                </Link>
              </>
            )}
          </div>

        </div>
      </nav>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-lg p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
              Sign Out?
            </h3>
            <p className="text-zinc-400 text-sm tracking-wide mb-6">
              You will be signed out and redirected to the login page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-2.5 rounded transition"
              >
                Yes, Sign Out
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold tracking-widest uppercase py-2.5 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}