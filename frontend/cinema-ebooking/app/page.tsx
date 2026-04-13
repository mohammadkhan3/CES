"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MovieModal from "./components/MovieModal";
import Link from "next/link";

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
  showroom?: {
    id: string;
    name: string;
  };
  display?: string;
};

function SkeletonCard() {
  return (
    <div className="text-center">
      <div className="w-full h-56 bg-zinc-800 animate-pulse" />
      <div className="h-6 w-2/3 bg-zinc-700 rounded mx-auto mt-4 animate-pulse" />
      <div className="h-4 w-1/2 bg-zinc-700 rounded mx-auto mt-3 animate-pulse" />
      <div className="h-4 w-1/3 bg-zinc-700 rounded mx-auto mt-2 animate-pulse" />
    </div>
  );
}

function MovieCard({
  movie,
  comingSoon,
  onClick,
  favoriteIds = [],
  onFavoriteChange,
  showtimes = [],
}: {
  movie: Movie;
  comingSoon?: boolean;
  onClick: () => void;
  favoriteIds?: string[];
  onFavoriteChange?: () => Promise<void> | void;
  showtimes?: Showtime[];
}) {
  const [isFavorite, setIsFavorite] = useState(favoriteIds.includes(movie.id));

  useEffect(() => {
    setIsFavorite(favoriteIds.includes(movie.id));
  }, [favoriteIds, movie.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user?.userId) {
      alert("Please log in or sign up to add movies to your favorites!");
      return;
    }

    const newState = !isFavorite;
    setIsFavorite(newState);

    try {
      const res = await fetch(`/api/profile/favorites/${movie.id}`, {
        method: newState ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email,
        },
      });
      if (!res.ok) {
        throw new Error("Favorite request failed");
      }

      if (onFavoriteChange) {
        await onFavoriteChange();
      }
    } catch {
      setIsFavorite(!newState);
    }
  };

  return (
    <div className="text-center group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden border border-transparent group-hover:border-zinc-700 transition duration-300">

        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 transition backdrop-blur-sm"
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={isFavorite ? "#dc2626" : "none"}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke={isFavorite ? "#dc2626" : "currentColor"}
            className="w-6 h-6 text-white transition-colors duration-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>

        {comingSoon && (
          <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rotate-12 shadow-lg">
            COMING SOON!
          </div>
        )}

        <div className="w-full h-80 bg-zinc-900 overflow-hidden relative">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              Poster
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
            <span className="border border-white px-4 py-2 text-xs uppercase tracking-widest">
              View Details
            </span>
          </div>
        </div>
      </div>

      <h3 className="mt-4 text-xl tracking-wide uppercase group-hover:text-red-500 transition">
        {movie.title}
      </h3>

      {!comingSoon && (
        <div className="mt-3 flex justify-center gap-2 flex-wrap">
          {showtimes.length > 0 ? (
            showtimes.slice(0, 3).map((show) => (
              <Link
                key={show.id}
                href={`/booking?showId=${show.id}&title=${encodeURIComponent(movie.title)}&showtime=${encodeURIComponent(show.display || `${show.date} ${show.time}`)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-3 py-1 border border-zinc-600 rounded text-zinc-300 hover:border-red-500 hover:text-white transition"
              >
                {show.time}
              </Link>
            ))
          ) : (
            <span className="text-xs text-zinc-400">No showtimes available</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim();
  const genre = (sp.get("genre") ?? "").trim();

  const [running, setRunning] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const [userEmail, setUserEmail] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showtimesByMovie, setShowtimesByMovie] = useState<Record<string, Showtime[]>>({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserEmail(user.email || "");
  }, []);

  const loadFavorites = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user?.email) {
      setFavoriteIds([]);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load favorites");
      }

      const data = await res.json();
      const ids = Array.isArray(data?.favorites)
        ? data.favorites.map((fav: { id?: string }) => fav.id).filter(Boolean)
        : [];

      setFavoriteIds(ids);
    } catch (error) {
      console.error("Error loading favorites:", error);
      setFavoriteIds([]);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (genre) params.set("genre", genre);

        const url = params.toString()
          ? `/api/movies/homepage?${params.toString()}`
          : "/api/movies/homepage";

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        let runningMovies: Movie[] = [];
        let comingSoonMovies: Movie[] = [];

        if (q || genre) {
          const list: Movie[] = Array.isArray(json?.data) ? json.data : [];
          runningMovies = list;
          comingSoonMovies = [];
        } else {
          const data = json?.data ?? {};
          runningMovies = Array.isArray(data.currently_running) ? data.currently_running : [];
          comingSoonMovies = Array.isArray(data.coming_soon) ? data.coming_soon : [];
        }
         
      setRunning(runningMovies);
      setComingSoon(comingSoonMovies);

      const showtimeEntries = await Promise.all(
          runningMovies.map(async (movie) => {
            try {
              const res = await fetch(`/api/movies/${movie.id}/showtimes`, {
                cache: "no-store",
              });
              const json = await res.json();
              return [movie.id, Array.isArray(json?.data) ? json.data : []] as const;
            } catch {
              return [movie.id, []] as const;
            }
          })
        );

        setShowtimesByMovie(Object.fromEntries(showtimeEntries));
      } catch {
        setRunning([]);
        setComingSoon([]);
        setShowtimesByMovie({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [q, genre]);

  const isFiltering = Boolean(q || genre);
  const showRunningSkeletons = loading;
  const showComingSkeletons = loading && !isFiltering;
  const noMatches = !loading && isFiltering && running.length === 0;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="font-diplomata text-5xl text-center mb-12 tracking-wide uppercase">
        Cinema E-booking System
      </h1>

      <div className="max-w-6xl mx-auto space-y-16">
        <section>
          <h2 className="text-2xl font-semibold tracking-wide mb-6">
            {isFiltering ? "Search Results" : "Currently Running"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {showRunningSkeletons ? (
              Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={`running-skel-${i}`} />
              ))
            ) : noMatches ? (
              <div className="col-span-full text-center text-zinc-400 uppercase tracking-widest text-sm py-10">
                No matches found.
              </div>
            ) : (
              running.map((m) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  comingSoon={m.status === "coming_soon"}
                  onClick={() => setSelectedMovie(m)}
                  favoriteIds={favoriteIds}
                  onFavoriteChange={loadFavorites}
                  showtimes={showtimesByMovie[m.id] || []}
                />
              ))
            )}
          </div>
        </section>

        {!isFiltering && (
          <section>
            <h2 className="text-2xl font-semibold tracking-wide mb-6">
              Coming Soon
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
              {showComingSkeletons ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`coming-skel-${i}`} />
                ))
              ) : (
                comingSoon.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    comingSoon
                    onClick={() => setSelectedMovie(m)}
                    favoriteIds={favoriteIds}
                    onFavoriteChange={loadFavorites}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} userEmail={userEmail} />
      )}
    </div>
  );
}