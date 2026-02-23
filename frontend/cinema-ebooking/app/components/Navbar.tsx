"use client";

import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    // 'sticky top-0 z-50' keeps the navbar at the top of the screen when scrolling
    <nav className="sticky top-0 z-50 bg-black border-b border-zinc-800 px-6 py-4 text-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo and Home Link */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <Image src="/favicon.ico" alt="CES Logo" width={32} height={32} />
          <span className="font-diplomata text-2xl tracking-tight">CES</span>
        </Link>

        {/* Search Bar  */}
        <div className="flex-1 max-w-md w-full">
          <input 
            type="text" 
            placeholder="Search movies by title..." 
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-red-600 transition"
          />
        </div>

        {/* Filters for Genre and Date */}
        <div className="flex items-center gap-4">
          <select className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs uppercase tracking-widest">
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
        </div>

        {/* User Login/Signup Actions */}
        <div className="flex items-center gap-6 ml-4">
          <Link href="/login" className="text-xs uppercase tracking-widest hover:text-red-600 transition">
            Login
          </Link>
          <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-xs font-bold uppercase transition">
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}