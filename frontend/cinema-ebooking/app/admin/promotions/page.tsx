"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManagePromotionsPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role !== "admin") {
      router.push("/login");
    }
  }, [router]);

  const [promo, setPromo] = useState({
    code: "",
    discountPercentage: "",
    expirationDate: "",
    sendEmail: false
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!promo.code || !promo.discountPercentage || !promo.expirationDate) {
      setIsError(true);
      setMessage("Please fill out all required fields.");
      return;
    }

    if (Number(promo.discountPercentage) <= 0 || Number(promo.discountPercentage) > 100) {
      setIsError(true);
      setMessage("Discount percentage must be between 1 and 100.");
      return;
    }

    setIsError(false);
    setMessage(promo.sendEmail ? "Saving promotion and preparing emails..." : "Saving promotion...");

    try {
      const res = await fetch("http://localhost:5000/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promo),
      });

      if (!res.ok) {
        throw new Error("Failed to save promotion to the backend.");
      }

      setIsError(false);
      setMessage(promo.sendEmail 
        ? "Promotion active! Emails dispatched to subscribed users." 
        : "Promotion active! Saved silently without email blast."
      );
      
      setPromo({
        code: "",
        discountPercentage: "",
        expirationDate: "",
        sendEmail: false
      });
      
      setTimeout(() => setMessage(""), 4000);

    } catch (error) {
      setIsError(true);
      setMessage("Server connection failed. Could not create promotion.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-6 inline-block">
          ← Back to Dashboard
        </Link>
        
        <div className="border-b border-zinc-800 pb-6 mb-10">
          <h1 className="text-4xl font-bold uppercase tracking-wider text-white">Manage Promotions</h1>
          <p className="text-zinc-500 text-sm tracking-wide mt-2">
            Create discount codes and notify your subscribed customers.
          </p>
        </div>

        {message && (
          <div className={`mb-8 p-4 border rounded font-bold uppercase tracking-widest text-sm transition-colors ${
            isError ? "bg-red-950/30 border-red-900 text-red-500" : "bg-green-950/30 border-green-900 text-green-500"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 p-8 rounded-lg space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Promo Code *</label>
              <input 
                type="text" 
                value={promo.code} 
                onChange={(e) => setPromo({...promo, code: e.target.value.toUpperCase()})} 
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white uppercase" 
              />
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Discount % *</label>
              <input 
                type="number" 
                value={promo.discountPercentage} 
                onChange={(e) => {
                  let val = e.target.value;
                  // Instantly stop the user from exceeding 100
                  if (Number(val) > 100) val = "100";
                  if (Number(val) < 0) val = "0";
                  setPromo({...promo, discountPercentage: val});
                }} 
                min="1"
                max="100"
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Expiration Date *</label>
            <input 
              type="date" 
              value={promo.expirationDate} 
              onChange={(e) => setPromo({...promo, expirationDate: e.target.value})} 
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]" 
            />
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={promo.sendEmail} 
                  onChange={(e) => setPromo({...promo, sendEmail: e.target.checked})}
                  className="sr-only"
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${promo.sendEmail ? 'bg-red-600' : 'bg-zinc-800'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${promo.sendEmail ? 'translate-x-4' : ''}`}></div>
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-white block">Email Subscribers</span>
                <span className="text-xs text-zinc-500">Send this promotion to users opted-in for promotional emails.</span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold uppercase tracking-widest transition"
            >
              Save Promotion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}