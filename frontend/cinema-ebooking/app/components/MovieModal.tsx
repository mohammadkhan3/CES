"use client";

import Link from "next/link";
import { useState } from "react";

type Movie = {
  id: string;
  title: string;
  genre?: string;
  status?: string;
  description?: string;
  rating?: string;
  poster_url?: string;
  trailer_url?: string;
};

function toEmbedUrl(url?: string) {
  if (!url) return "";

  if (url.includes("youtube.com/embed/")) return url;

  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

  const long = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (long?.[1]) return `https://www.youtube.com/embed/${long[1]}`;

  return url;
}

export default function MovieModal({
  movie,
  onClose,
  userEmail,
}: {
  movie: Movie;
  onClose: () => void;
  userEmail: string;
}) {
  const [favoriteMessage, setFavoriteMessage] = useState("");

  if (!movie) return null;

  const showtimes = ["2:00 PM", "5:00 PM", "8:00 PM"];

  const handleAddFavorite = async () => {
    if(!userEmail) {
      setFavoriteMessage("Could not identify logged in user.");
      return;
    }

    try {
      const res = await fetch(`/api/profile/favorites/${movie.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setFavoriteMessage(data.message || "Added to favorites.");
      } else {
        setFavoriteMessage(data.message || data.error || "Failed to add favorite.");
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
      setFavoriteMessage("Could not add favorite.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold text-2xl z-10 transition"
        >
          &times;
        </button>

        <div className="w-full md:w-1/3 bg-zinc-900 border-r border-zinc-800">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center text-white/40 uppercase tracking-widest text-sm">
              No Poster
            </div>
          )}
        </div>

        <div className="p-8 md:w-2/3 flex flex-col text-white">
          <h2 className="text-3xl font-diplomata uppercase tracking-wider mb-2">
            {movie.title}
          </h2>

          <div className="flex gap-3 text-xs text-red-500 mb-6 uppercase tracking-widest font-bold">
            <span>{movie.rating || "PG-13"}</span>
            <span>|</span>
            <span className="text-zinc-400">{movie.genre || "Action"}</span>
          </div>

          <div className="mb-6 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handleAddFavorite}
              className="bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-600 transition px-4 py-2 rounded text-xs font-bold tracking-widest uppercase text-red-400 hover:text-white"
            >
              ♥ Add to Favorites
            </button>

            {favoriteMessage && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">
                {favoriteMessage}
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
            {movie.description || "No description available in the database yet."}
          </p>

          <div className="w-full aspect-video bg-black mb-8 border border-zinc-800 rounded overflow-hidden">
            {movie.trailer_url ? (
              <iframe
                className="w-full h-full"
                src={toEmbedUrl(movie.trailer_url)}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm tracking-widest uppercase">
                Trailer Not Available
              </div>
            )}
          </div>

          {movie.status !== "coming_soon" && (
            <div className="mt-auto">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-zinc-400">
                Select Showtime to Book
              </h3>
              <div className="flex flex-wrap gap-3">
                {showtimes.map((time) => (
                  <Link
                    key={time}
                    href={`/booking?title=${encodeURIComponent(movie.title)}&showtime=${encodeURIComponent(time)}`}
                    className="bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-600 transition px-5 py-2 rounded text-sm font-bold tracking-widest"
                  >
                    {time}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}