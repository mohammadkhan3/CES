"use client";

import { useState } from "react";

export default function EditProfilePage() {

  const [name, setName] = useState("John Doe");
  const email = "user@ces.com"; 
  const [phone, setPhone] = useState("555-0198");

  // Address State 
  const [address, setAddress] = useState("123 Cinema Way, Athens, GA 30602");

  // Payment Cards State 
  const [cards, setCards] = useState([
    { id: 1, last4: "4242", exp: "12/25" }
  ]);
  const [newCardInput, setNewCardInput] = useState("");

  // Password State 
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Favorites State 
  const [favorites] = useState([
    { id: "1", title: "F1: THE MOVIE", poster_url: "https://via.placeholder.com/150" }
  ]);

  const [message, setMessage] = useState("");


  const handleAddCard = () => {
    if (cards.length >= 3) {
      setMessage("You cannot store more than 3 payment cards.");
      return;
    }
    if (newCardInput) {
      setCards([...cards, { id: Date.now(), last4: newCardInput.slice(-4), exp: "12/26" }]);
      setNewCardInput("");
      setMessage("Card added successfully!");
    }
  };

  const handleRemoveCard = (id: number) => {
    setCards(cards.filter(card => card.id !== id));
  };

  const handleSaveChanges = (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    // Check password logic
    if (newPassword && !currentPassword) {
      setMessage("Error: You must enter your current password to set a new password.");
      return;
    }

    // Send data to Flask backend HERE
    setMessage("Profile updated successfully! (Email notification would be sent here)");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-diplomata uppercase tracking-wider mb-8 border-b border-zinc-800 pb-4">
          Manage Profile
        </h1>

        {message && (
          <div className={`p-4 rounded border text-sm font-bold tracking-widest uppercase ${message.includes("Error") ? "bg-red-900/50 border-red-500 text-red-200" : "bg-green-900/50 border-green-500 text-green-200"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Form Info */}
          <form onSubmit={handleSaveChanges} className="space-y-8">
            
            {/* Personal Details */}
            <section className="bg-zinc-950 p-6 rounded border border-zinc-800">
              <h2 className="text-xl font-bold tracking-widest text-zinc-400 mb-4 uppercase">Personal Info</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Email Address (Uneditable)</label>
              
                  <input type="email" value={email} readOnly className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-600 outline-none" />
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="bg-zinc-950 p-6 rounded border border-zinc-800">
              <h2 className="text-xl font-bold tracking-widest text-zinc-400 mb-4 uppercase">Home Address</h2>
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Primary Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-600 outline-none resize-none h-20" />
              </div>
            </section>

            {/* Security */}
            <section className="bg-zinc-950 p-6 rounded border border-zinc-800">
              <h2 className="text-xl font-bold tracking-widest text-zinc-400 mb-4 uppercase">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Current Password *</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Required to make changes" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white focus:border-red-600 outline-none" />
                </div>
              </div>
            </section>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase py-3 rounded transition">
              Save All Changes
            </button>
          </form>

          {/* Cards & Favorites */}
          <div className="space-y-8">
            
            {/* Payment Cards */}
            <section className="bg-zinc-950 p-6 rounded border border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold tracking-widest text-zinc-400 uppercase">Payment Cards</h2>
                <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{cards.length} / 3</span>
              </div>
              
              <div className="space-y-3 mb-4">
                {cards.map(card => (
                  <div key={card.id} className="flex justify-between items-center bg-zinc-900 border border-zinc-700 p-3 rounded">
                    <span className="text-sm font-mono tracking-widest">•••• {card.last4}</span>
                    <button onClick={() => handleRemoveCard(card.id)} className="text-red-500 hover:text-red-400 text-xs uppercase font-bold tracking-widest">Remove</button>
                  </div>
                ))}
                {cards.length === 0 && <div className="text-zinc-600 text-sm italic">No cards saved.</div>}
              </div>

              {cards.length < 3 ? (
                <div className="flex gap-2">
                  <input type="text" value={newCardInput} onChange={e => setNewCardInput(e.target.value)} placeholder="Card Number" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm outline-none" />
                  <button onClick={handleAddCard} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 rounded text-sm font-bold uppercase tracking-widest transition">Add</button>
                </div>
              ) : (
                <div className="text-xs text-red-500 uppercase tracking-widest mt-2">Maximum of 3 cards reached.</div>
              )}
            </section>

            {/* Favorite Movies */}
            <section className="bg-zinc-950 p-6 rounded border border-zinc-800">
              <h2 className="text-xl font-bold tracking-widest text-zinc-400 mb-4 uppercase">My Favorites</h2>
              <div className="grid grid-cols-2 gap-4">
                {favorites.map(fav => (
                  <div key={fav.id} className="relative group cursor-pointer border border-zinc-800 rounded overflow-hidden">
                    <img src={fav.poster_url} alt={fav.title} className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 p-2 text-center text-xs font-bold uppercase tracking-widest truncate">
                      {fav.title}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}