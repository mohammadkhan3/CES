"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

type Showtime = {
  id: string;
  date: string;
  time: string;
  duration?: number;
  showroom: { id: string; name: string };
  display: string;
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

function groupByDate(showtimes: Showtime[]): Record<string, Showtime[]> {
  return showtimes.reduce((acc, st) => {
    if (!acc[st.date]) acc[st.date] = [];
    acc[st.date].push(st);
    return acc;
  }, {} as Record<string, Showtime[]>);
}

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch { return d; }
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
  const router = useRouter();
  const [favoriteMessage, setFavoriteMessage]   = useState("");
  const [showtimes, setShowtimes]               = useState<Showtime[]>([]);
  const [showtimesLoading, setShowtimesLoading] = useState(false);
  const [showtimesError, setShowtimesError]     = useState("");

  useEffect(() => {
    if (!movie || movie.status === "coming_soon") return;
    const load = async () => {
      setShowtimesLoading(true);
      setShowtimesError("");
      try {
        const res = await fetch(`/api/movies/${movie.id}/showtimes`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setShowtimes(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setShowtimesError("Could not load showtimes.");
      } finally {
        setShowtimesLoading(false);
      }
    };
    load();
  }, [movie]);

  if (!movie) return null;

  const handleAddFavorite = async () => {
    if (!userEmail) { setFavoriteMessage("Please log in to add favorites."); return; }
    try {
      const res = await fetch(`/api/profile/favorites/${movie.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": userEmail },
      });
      const data = await res.json();
      setFavoriteMessage(
        res.ok ? data.message || "Added to favorites." : data.message || data.error || "Failed."
      );
    } catch {
      setFavoriteMessage("Could not add favorite.");
    }
  };

  const handleShowtimeSelect = (st: Showtime) => {
    const params = new URLSearchParams({
      show_id:    st.id,
      movie_id:   movie.id,
      title:      movie.title,
      date:       st.date,
      time:       st.time,
      showroom:   st.showroom.name,
      poster_url: movie.poster_url || "",
      rating:     movie.rating     || "",
      genre:      movie.genre      || "",
    });
    router.push(`/booking?${params.toString()}`);
    onClose();
  };

  const grouped     = groupByDate(showtimes);
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl">

        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold text-2xl z-10 transition">
          &times;
        </button>

        <div className="w-full md:w-1/3 bg-zinc-900 border-r border-zinc-800 flex-shrink-0">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center text-white/40 uppercase tracking-widest text-sm">
              No Poster
            </div>
          )}
        </div>

        <div className="p-8 md:w-2/3 flex flex-col text-white">
          <h2 className="text-3xl font-diplomata uppercase tracking-wider mb-2">{movie.title}</h2>

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
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">{favoriteMessage}</span>
            )}
          </div>

          <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
            {movie.description || "No description available."}
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

          {movie.status !== "coming_soon" ? (
            <div className="mt-auto">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-zinc-400">
                Select Showtime to Book
              </h3>

              {showtimesLoading && (
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3].map((i) => <div key={i} className="h-12 w-28 bg-zinc-800 animate-pulse rounded" />)}
                </div>
              )}

              {showtimesError && (
                <p className="text-xs text-red-400 uppercase tracking-widest">{showtimesError}</p>
              )}

              {!showtimesLoading && !showtimesError && showtimes.length === 0 && (
                <p className="text-xs text-zinc-500 uppercase tracking-widest">No showtimes scheduled.</p>
              )}

              {!showtimesLoading && sortedDates.length > 0 && (
                <div className="space-y-5">
                  {sortedDates.map((date) => (
                    <div key={date}>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{formatDate(date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {grouped[date].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => handleShowtimeSelect(st)}
                            className="bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-600 transition px-4 py-2 rounded text-sm font-bold tracking-widest text-white flex flex-col items-center gap-0.5"
                          >
                            <span>{st.time}</span>
                            <span className="text-[10px] text-zinc-400 font-normal normal-case tracking-normal">{st.showroom.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-auto">
              <p className="text-xs text-zinc-500 uppercase tracking-widest border border-zinc-800 px-4 py-3 rounded text-center">
                Coming Soon — Showtimes Not Yet Available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}