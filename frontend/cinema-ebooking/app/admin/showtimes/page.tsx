"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManageShowtimesPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);

  // route guard
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role !== "admin") {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/movies");
        if (res.ok) {
          const data = await res.json();
          setMovies(data);
        } else {
          console.error("Failed to fetch movies from database.");
        }
      } catch (error) {
        console.error("Failed to connect to backend:", error);
      }
    };
    fetchMovies();
  }, []);

  const [showtime, setShowtime] = useState({
    movieId: "",
    date: "",
    time: "",
    showroomId: ""
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showtime.movieId || !showtime.date || !showtime.time || !showtime.showroomId) {
      setIsError(true);
      setMessage("Please fill out all required fields.");
      return;
    }

    setIsError(false);
    setMessage("Checking availability and saving...");

    try {
      // BACKEND CALL
      const res = await fetch("http://localhost:5000/api/showtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(showtime),
      });

      if (res.status === 409) {
        // HTTP 409 conflict = showroom already booked
        setIsError(true);
        setMessage(`CONFLICT: Showroom ${showtime.showroomId} is already booked at this date and time.`);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to save showtime.");
      }

      setIsError(false);
      setMessage("Showtime successfully scheduled!");
      
      setShowtime({
        movieId: "",
        date: "",
        time: "",
        showroomId: ""
      });
      
      setTimeout(() => setMessage(""), 3000);

    } catch (error) {
      setIsError(true);
      setMessage("Server connection failed. Could not schedule showtime.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-6 inline-block">
          ← Back to Dashboard
        </Link>
        
        <div className="border-b border-zinc-800 pb-6 mb-10">
          <h1 className="text-4xl font-bold uppercase tracking-wider text-white">Schedule Showtimes</h1>
          <p className="text-zinc-500 text-sm tracking-wide mt-2">
            Assign movies to showrooms and set viewing times.
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
          
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Select Movie *</label>
            <select 
              value={showtime.movieId} 
              onChange={(e) => setShowtime({...showtime, movieId: e.target.value})} 
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
            >
              <option value="" disabled>-- Select a Movie --</option>
              {movies.map((m) => (
                <option key={m._id} value={m._id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Date *</label>
              <input 
                type="date" 
                value={showtime.date} 
                onChange={(e) => setShowtime({...showtime, date: e.target.value})} 
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]" 
              />
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Time *</label>
              <input 
                type="time" 
                value={showtime.time} 
                onChange={(e) => setShowtime({...showtime, time: e.target.value})} 
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Assign Showroom *</label>
            <select 
              value={showtime.showroomId} 
              onChange={(e) => setShowtime({...showtime, showroomId: e.target.value})} 
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
            >
              <option value="" disabled>-- Select Showroom --</option>
              <option value="1">Showroom 1 (Standard - 50 Seats)</option>
              <option value="2">Showroom 2 (IMAX - 100 Seats)</option>
              <option value="3">Showroom 3 (VIP - 30 Seats)</option>
            </select>
            <p className="text-xs text-zinc-600 mt-2 tracking-wide">
              * Required: System will verify showroom availability to prevent scheduling conflicts.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold uppercase tracking-widest transition"
            >
              Schedule Movie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}