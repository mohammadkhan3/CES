"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManageMoviesPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role !== "admin") router.push("/login");
  }, [router]);

  const [movie, setMovie] = useState({
    title: "",
    rating: "",
    genre: "",
    description: "",
    trailerLink: "",
    posterUrl: "",
    cast: "",
    director: "",
    producer: "",
    status: "currently_running",
    releaseDate: "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !movie.title || !movie.rating || !movie.genre ||
      !movie.description || !movie.trailerLink || !movie.posterUrl
    ) {
      setIsError(true);
      setMessage("Please fill out all required fields.");
      return;
    }

    setIsError(false);
    setMessage("Saving movie...");

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      const res = await fetch("/api/admin/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email || "",
        },
        body: JSON.stringify(movie),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || "Failed to save movie.");
        return;
      }

      setIsError(false);
      setMessage("Movie successfully added!");
      setMovie({
        title: "", rating: "", genre: "", description: "",
        trailerLink: "", posterUrl: "", cast: "", director: "",
        producer: "", status: "currently_running", releaseDate: "",
      });
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setIsError(true);
      setMessage("Server connection failed. Could not add movie.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="border-b border-zinc-800 pb-6 mb-10">
          <h1 className="text-4xl font-bold uppercase tracking-wider text-white">Add New Movie</h1>
          <p className="text-zinc-500 text-sm tracking-wide mt-2">
            Enter the movie details to display on the user portal.
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

          {/* Title + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Movie Title *</label>
              <input
                type="text"
                value={movie.title}
                onChange={(e) => setMovie({ ...movie, title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Status *</label>
              <select
                value={movie.status}
                onChange={(e) => setMovie({ ...movie, status: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
              >
                <option value="currently_running">Currently Running</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
          </div>

          {/* Rating + Genre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Rating *</label>
              <select
                value={movie.rating}
                onChange={(e) => setMovie({ ...movie, rating: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
              >
                <option value="" disabled>-- Select Rating --</option>
                <option value="G">G</option>
                <option value="PG">PG</option>
                <option value="PG-13">PG-13</option>
                <option value="R">R</option>
                <option value="NC-17">NC-17</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Genre *</label>
              <select
                value={movie.genre}
                onChange={(e) => setMovie({ ...movie, genre: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white appearance-none"
              >
                <option value="" disabled>-- Select Genre --</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
                <option value="Animation">Animation</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Horror">Horror</option>
                <option value="Romance">Romance</option>
                <option value="Sci-Fi">Sci-Fi</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Description *</label>
            <textarea
              value={movie.description}
              onChange={(e) => setMovie({ ...movie, description: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded h-32 focus:border-red-600 outline-none resize-none transition text-white"
            />
          </div>

          {/* Cast / Director / Producer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Cast</label>
              <input
                type="text"
                value={movie.cast}
                onChange={(e) => setMovie({ ...movie, cast: e.target.value })}
                placeholder="e.g. Actor One, Actor Two"
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Director</label>
              <input
                type="text"
                value={movie.director}
                onChange={(e) => setMovie({ ...movie, director: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Producer</label>
              <input
                type="text"
                value={movie.producer}
                onChange={(e) => setMovie({ ...movie, producer: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
          </div>

          {/* Trailer + Poster */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Trailer URL *</label>
              <input
                type="text"
                value={movie.trailerLink}
                onChange={(e) => setMovie({ ...movie, trailerLink: e.target.value })}
                placeholder="https://youtu.be/..."
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Poster URL *</label>
              <input
                type="text"
                value={movie.posterUrl}
                onChange={(e) => setMovie({ ...movie, posterUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white"
              />
            </div>
          </div>

          {/* Release Date */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-2 font-bold tracking-widest">Release Date</label>
            <input
              type="date"
              value={movie.releaseDate}
              onChange={(e) => setMovie({ ...movie, releaseDate: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded focus:border-red-600 outline-none transition text-white [color-scheme:dark]"
            />
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold uppercase tracking-widest transition"
            >
              Save Movie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}