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

  const onGo = () => {
    pushUrl(q, genre);
  };

  const onClear = () => {
    setQ("");
    setGenre("All Genres");
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-zinc-800 px-6 py-4 text-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Home Link */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <Image src="/favicon.ico" alt="CES Logo" width={32} height={32} />
          <span className="font-diplomata text-2xl tracking-tight">CES</span>
        </Link>

        {/* Search Bar + Go */}
        <div className="flex-1 max-w-md w-full flex gap-2">
          <input
            type="text"
            placeholder="Search movies by title..."
            value={q}
            onChange={(e) => {
              const val = e.target.value;
              setQ(val);

              if (val.trim() === "") {
                pushUrl("", genre);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onGo();
            }}
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

        {/* Filters for Genre and Date */}
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

          {/* Date input UI-only */}
          <input
            type="date"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs uppercase"
          />

          {/* Clear button (removes q + genre) */}
          <button
            type="button"
            onClick={onClear}
            className="text-xs uppercase tracking-widest hover:text-red-600 transition"
          >
            Clear
          </button>
        </div>

        {/* User Login/Signup Actions */}
        <div className="flex items-center gap-6 ml-4">
          <Link href="/profile" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
            Profile
          </Link>
          
          <Link href="/login" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
            Login
          </Link>

          <Link href="/register" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-xs font-bold uppercase transition">
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}