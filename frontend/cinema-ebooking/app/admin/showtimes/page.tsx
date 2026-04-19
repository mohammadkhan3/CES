"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Movie = { id: string; title: string };
type Showroom = { id: string; name: string; numberOfSeats: number };

export default function ManageShowtimesPage() {
  const router = useRouter();
  const [message, setMessage]     = useState("");
  const [isError, setIsError]     = useState(false);
  const [movies, setMovies]       = useState<Movie[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role !== "admin") router.push("/login");
  }, [router]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const headers = { "X-User-Email": user.email || "" };

    // Fetch movies
    fetch("/api/movies/homepage", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const running = Array.isArray(json?.data?.currently_running) ? json.data.currently_running : [];
        const soon    = Array.isArray(json?.data?.coming_soon)       ? json.data.coming_soon       : [];
        setMovies([...running, ...soon].map((m: any) => ({ id: m.id, title: m.title })));
      })
      .catch(() => {});

    // Fetch real showrooms from DB
    fetch("/api/admin/showrooms", { cache: "no-store", headers })
      .then((r) => r.json())
      .then((json) => {
        setShowrooms(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {});
  }, []);

  const [showtime, setShowtime] = useState({
    movieId: "",
    date: "",
    time: "",
    showroomId: "",
    duration: "120",
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

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      const res = await fetch("/api/admin/showtimes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email || "",
        },
        body: JSON.stringify({
          movieId:    showtime.movieId,
          date:       showtime.date,
          time:       showtime.time,
          showroomId: showtime.showroomId,
          duration:   parseInt(showtime.duration) || 120,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setIsError(true);
        setMessage(data.message || "Scheduling conflict detected.");
        return;
      }

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || "Failed to schedule showtime.");
        return;
      }

      setIsError(false);
      setMessage("Showtime successfully scheduled!");
      setShowtime({ movieId: "", date: "", time: "", showroomId: "", duration: "120" });
      setTimeout(() => setMessage(""), 3000);
    } catch {
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
          <div className={`mb-8 p-4 border rounded font-bold uppercase tracking-widest text-sm ${
            isError ? "bg-red-950/30 border-red-900 text-red-500" : "bg-green-950/30 border-green-900 text-green-500"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 p-8 rounded-lg space-y-6">

          {/* Movie */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Select Movie *</label>
            <select
              value={showtime.movieId}
              onChange={(e) => setShowtime({ ...showtime, movieId: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
            >
              <option value="" disabled>-- Select a Movie --</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Date *</label>
              <input
                type="date"
                value={showtime.date}
                onChange={(e) => setShowtime({ ...showtime, date: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Time *</label>
              <input
                type="time"
                value={showtime.time}
                onChange={(e) => setShowtime({ ...showtime, time: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Showroom + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Showroom *</label>
              <select
                value={showtime.showroomId}
                onChange={(e) => setShowtime({ ...showtime, showroomId: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
              >
                <option value="" disabled>-- Select Showroom --</option>
                {showrooms.map((sr) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.name} ({sr.numberOfSeats} seats)
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-600 mt-2 tracking-wide">
                System will verify availability to prevent scheduling conflicts.
              </p>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Duration (minutes)</label>
              <input
                type="number"
                min="30"
                max="300"
                value={showtime.duration}
                onChange={(e) => setShowtime({ ...showtime, duration: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
              <p className="text-xs text-zinc-600 mt-2 tracking-wide">
                Used to detect overlapping shows. Default: 120 min.
              </p>
            </div>
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