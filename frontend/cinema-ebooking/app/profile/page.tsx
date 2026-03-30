"use client";

import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    cards: [] as string[],
    favorites: [] as string[]
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile({
            ...data,
            address: data.mailingAddress || { street: "", city: "", state: "", zipCode: "" }
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

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Saving to database...");

    try {
      const res = await fetch("http://localhost:5000/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          mailingAddress: profile.address
        }),
      });
      
      if (res.ok) {
        setMessage("Profile successfully updated!");
      } else {
        setMessage("Failed to update profile.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Could not connect to the database.");
    }
  };

  const handleAddCard = () => {
    if (profile.cards.length < 3) {
      setProfile({ ...profile, cards: [...profile.cards, "9999"] });
    }
  };

  const handleRemoveCard = (indexToRemove: number) => {
    const updatedCards = profile.cards.filter((_, index) => index !== indexToRemove);
    setProfile({ ...profile, cards: updatedCards });
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex justify-center items-center">Loading Profile Data...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-diplomata text-center mb-10 uppercase tracking-tighter">Manage Profile</h1>

        {message && (
          <div className="mb-6 p-4 bg-zinc-900 border border-red-600 text-center font-bold uppercase tracking-widest text-xs">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-zinc-950 p-6 rounded border border-zinc-800">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">Personal Info</h2>
            
            <label className="block text-[10px] text-zinc-500 uppercase mb-1">Email Address (Read-Only)</label>
            <input 
              type="email" 
              value={profile.email || ""} 
              disabled 
              className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 text-zinc-500 cursor-not-allowed" 
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">First Name</label>
                <input 
                  type="text" 
                  value={profile.firstName || ""} 
                  onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 focus:border-red-600 outline-none transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">Last Name</label>
                <input 
                  type="text" 
                  value={profile.lastName || ""} 
                  onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 mb-4 focus:border-red-600 outline-none transition" 
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded border border-zinc-800">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">Home Address</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase mb-1">Street Address</label>
                <input 
                  type="text"
                  value={profile.address?.street || ""}
                  onChange={(e) => setProfile({...profile, address: {...profile.address, street: e.target.value}})}
                  className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1">City</label>
                  <input 
                    type="text"
                    value={profile.address?.city || ""}
                    onChange={(e) => setProfile({...profile, address: {...profile.address, city: e.target.value}})}
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1">State</label>
                    <input 
                      type="text"
                      value={profile.address?.state || ""}
                      onChange={(e) => setProfile({...profile, address: {...profile.address, state: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1">ZIP Code</label>
                    <input 
                      type="text"
                      value={profile.address?.zipCode || ""}
                      onChange={(e) => setProfile({...profile, address: {...profile.address, zipCode: e.target.value}})}
                      className="w-full bg-zinc-900 border border-zinc-700 p-2 focus:border-red-600 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 mt-4 uppercase tracking-tighter">* Restricted to one primary address.</p>
          </div>

          <div className="bg-zinc-950 p-6 rounded border border-zinc-800 md:col-span-2">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
               <h2 className="text-red-600 font-bold uppercase tracking-widest text-sm">
                 Payment Methods ({(profile.cards || []).length}/3)
               </h2>
               {(profile.cards || []).length < 3 && (
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
              {(profile.cards || []).map((card, index) => (
                <div key={index} className="bg-zinc-900 p-4 border border-zinc-700 flex justify-between items-center rounded">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 p-2 rounded text-[10px]">💳</div>
                    <span className="text-sm tracking-widest">**** {card}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveCard(index)}
                    className="text-[10px] text-red-600 hover:text-red-400 uppercase font-bold transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {(profile.cards || []).length === 0 && (
                <p className="text-zinc-600 text-xs">No payment cards saved.</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-950 p-6 rounded border border-zinc-800 md:col-span-2">
            <h2 className="text-red-600 font-bold mb-4 uppercase tracking-widest text-sm border-b border-zinc-800 pb-2">My Favorites</h2>
            <div className="flex flex-wrap gap-4">
              {(profile.favorites || []).map((fav, index) => (
                <div key={index} className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="text-red-500">♥</span> {fav}
                </div>
              ))}
              {(profile.favorites || []).length === 0 && (
                <p className="text-zinc-600 text-xs">No movies favorited yet. Browse movies to add them here!</p>
              )}
            </div>
          </div>

          <button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 py-4 font-bold uppercase tracking-widest rounded transition">
            Save All Changes
          </button>
        </form>
      </div>
    </div>
  );
}