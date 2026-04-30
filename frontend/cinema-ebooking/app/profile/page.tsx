"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; 

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "No response body" };
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: { street: "", city: "", state: "", zipCode: "" },
    cards: [] as { id: string; last4: string; exp: string }[],
    favorites: [] as { id: string; title: string }[]
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserEmail(user.email || "");
  }, []);

  const loadProfile = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/profile", {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile({
          firstName: data.firstName || "",
          lastName:  data.lastName  || "",
          email:     data.email     || "",
          address: data.mailingAddress || { street: "", city: "", state: "", zipCode: "" },
          cards: Array.isArray(data.cards)
            ? data.cards.map((card: { id?: string; last4?: string; exp?: string }) => ({
                id:   card.id   || "",
                last4: card.last4 || "",
                exp:  card.exp  || ""
              }))
            : [],
          favorites: Array.isArray(data.favorites)
            ? data.favorites.map((fav: { id?: string; title?: string }) => ({
                id:    fav.id    || "",
                title: fav.title || ""
              }))
            : []
        });
      } else {
        setMessage("Failed to load profile data.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage("Could not connect to the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      loadProfile();
    }
  }, [userEmail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    // Password validation
    if (newPassword) {
      if (!currentPassword) {
        setMessage("Error: You must enter your current password to set a new password.");
        return;
      }
      const pwFails = PASSWORD_RULES.filter(r => !r.test(newPassword));
      if (pwFails.length > 0) {
        setMessage("Error: New password must meet all requirements.");
        return;
      }
    }

    setMessage("Saving to database...");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          mailingAddress: profile.address,
          cards: profile.cards.map((card, index) => ({
            id:   card.id || String(index + 1),
            last4: card.last4,
            exp: card.exp
          })),
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Profile successfully updated!");
        setCurrentPassword("");
        setNewPassword("");
        await loadProfile();
      } else {
        setMessage(data.message || data.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Could not connect to the database.");
    }
  };

  const handleAddCard = () => {
    if (profile.cards.length < 3) {
      setProfile({
        ...profile,
        cards: [...profile.cards, { id: String(profile.cards.length + 1), last4: "", exp: "" }]
      });
    }
  };

  const handleRemoveCard = (indexToRemove: number) => {
    setProfile({ ...profile, cards: profile.cards.filter((_, i) => i !== indexToRemove) });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        Loading Profile Data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-diplomata text-center mb-6 uppercase tracking-tighter">
          Manage Profile
        </h1>

        {/* Link to the History / AI page */}
        <div className="mb-10 flex justify-center">
          <Link
            href="/profile/history"
            className="text-xs uppercase tracking-widest border border-zinc-700 px-6 py-3 hover:border-white hover:text-white transition font-bold text-zinc-400"
          >
            View Order History & AI Recommendations →
          </Link>
        </div>

        {message && (
          <div className={`mb-6 p-4 border text-center font-bold uppercase tracking-widest text-xs ${
            message.startsWith("Error")
              ? "bg-red-900/50 border-red-500 text-red-200"
              : "bg-zinc-900 border-red-600"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Personal Info */}
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">
              Personal Info
            </h2>

            <label className="block text-[10px] text-zinc-500 uppercase mb-1">
              Email Address (Read-Only)
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 text-zinc-500 cursor-not-allowed"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 focus:border-red-600 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Home Address */}
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">
              Home Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">Street Address</label>
                <input
                  type="text"
                  value={profile.address?.street || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      address: { ...profile.address, street: e.target.value }
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={profile.address?.city || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, city: e.target.value }
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1">State</label>
                    <input
                      type="text"
                      value={profile.address?.state || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, state: e.target.value }
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={profile.address?.zipCode || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, zipCode: e.target.value }
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-4 uppercase tracking-tighter">
              * Restricted to one primary address.
            </p>
          </div>

          {/* Change Password */}
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800 md:col-span-2">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">
              Change Password
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required to change password"
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                />
                {newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map(rule => {
                      const passed = rule.test(newPassword);
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
            </div>
          </div>

          {/* Payment Cards */}
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800 md:col-span-2">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
              <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm">
                Payment Methods ({profile.cards.length}/3)
              </h2>
              {profile.cards.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded uppercase tracking-widest transition"
                >
                  + Add Card
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profile.cards.map((card, index) => (
                <div key={card.id || index} className="bg-zinc-900 p-4 border border-zinc-700 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-zinc-800 p-2 rounded text-[10px]">💳</div>
                      <span className="text-xs uppercase tracking-widest text-zinc-400">Card {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(index)}
                      className="text-[10px] text-red-600 hover:text-red-400 uppercase font-bold transition"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Last 4 Digits</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={card.last4}
                        onChange={(e) => {
                          const updated = [...profile.cards];
                          updated[index] = { ...updated[index], last4: e.target.value.replace(/\D/g, "").slice(0, 4) };
                          setProfile({ ...profile, cards: updated });
                        }}
                        className="w-full bg-zinc-950 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Expiration Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={card.exp}
                        onChange={(e) => {
                          const updated = [...profile.cards];
                          updated[index] = { ...updated[index], exp: e.target.value };
                          setProfile({ ...profile, cards: updated });
                        }}
                        className="w-full bg-zinc-950 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {profile.cards.length === 0 && (
                <p className="text-zinc-600 text-xs">No payment cards saved.</p>
              )}
            </div>
          </div>

          {/* Favorites */}
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800 md:col-span-2">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">
              My Favorites
            </h2>
            <div className="flex flex-wrap gap-4">
              {profile.favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded text-xs uppercase tracking-widest flex items-center gap-2"
                >
                  <span className="text-red-500">♥</span>
                  {fav.title}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/profile/favorites/${fav.id}`, {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            "X-User-Email": userEmail,
                          },
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setMessage(data.message || "Favorite removed.");
                          await loadProfile();
                        } else {
                          setMessage(data.message || "Failed to remove favorite.");
                        }
                      } catch {
                        setMessage("Could not remove favorite.");
                      }
                    }}
                    className="text-[10px] text-red-600 hover:text-red-400 uppercase font-bold ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {profile.favorites.length === 0 && (
                <p className="text-zinc-600 text-xs">No favorites yet. Browse movies and click ♥ to add some!</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="md:col-span-2 bg-red-600 hover:bg-red-700 py-4 font-bold uppercase tracking-widest rounded transition"
          >
            Save All Changes
          </button>

        </form>
      </div>
    </div>
  );
}