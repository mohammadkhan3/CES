"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_MENU = [
  {
    label: "Manage Movies",
    href: "/admin/movies",
    icon: "🎬",
    description: "Add, edit, or remove movies from the system.",
  },
  {
    label: "Promotions",
    href: "/admin/promotions",
    icon: "🎟️",
    description: "Create and manage discount codes and promotions.",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "👥",
    description: "View and manage registered user accounts.",
  },
  {
    label: "Showtimes",
    href: "/admin/showtimes",
    icon: "🕐",
    description: "Schedule and manage movie showtimes.",
  },
];

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="border-b border-zinc-800 pb-6 mb-10">
          <p className="text-xs uppercase tracking-widest text-red-500 mb-2 font-bold">
            Admin Portal
          </p>
          <h1 className="text-4xl font-bold uppercase tracking-wider">
            Dashboard
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide mt-2">
            Manage all aspects of the Cinema E-Booking System.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ADMIN_MENU.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group bg-zinc-950 border border-zinc-800 hover:border-red-600 rounded-lg p-6 flex items-start gap-5 transition"
            >
              <div className="text-4xl mt-1">{item.icon}</div>
              <div>
                <h2 className="text-lg font-bold uppercase tracking-widest text-white group-hover:text-red-500 transition mb-1">
                  {item.label}
                </h2>
                <p className="text-zinc-500 text-sm tracking-wide leading-relaxed">
                  {item.description}
                </p>
              </div>
              <span className="ml-auto text-zinc-700 group-hover:text-red-500 transition text-xl self-center">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-zinc-600 hover:text-white transition"
          >
            ← Back to Main Site
          </Link>
        </div>
      </div>
    </div>
  );
}