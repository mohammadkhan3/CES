"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MovieModal from "./components/MovieModal";

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
}: {
  movie: Movie;
  comingSoon?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="text-center group cursor-pointer" onClick={onClick}>
      <div className="relative overflow-hidden border border-transparent group-hover:border-zinc-700 transition duration-300">
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

      {/* showtimes */}
      {!comingSoon && (
      <div className="mt-3 flex justify-center gap-2 flex-wrap">
        {["2:00 PM", "5:00 PM", "8:00 PM"].map((time) => (
          <span
            key={time}
            className="text-xs px-3 py-1 border border-zinc-600 rounded text-zinc-300"
          >
            {time}
          </span>
        ))}
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

  // track which movie is clicked for the modal
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // single proxy route: homepage handles optional q/genre
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (genre) params.set("genre", genre);

        const url = params.toString()
          ? `/api/movies/homepage?${params.toString()}`
          : "/api/movies/homepage";

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        // if q or genre is set, Flask returns: { data: [...] }
        if (q || genre) {
          const list: Movie[] = Array.isArray(json?.data) ? json.data : [];
          setRunning(list);
          setComingSoon([]); // show results in the first section only
        } else {
          // homepage returns: { data: { currently_running, coming_soon } }
          const data = json?.data ?? {};
          const r: Movie[] = Array.isArray(data.currently_running)
            ? data.currently_running
            : [];
          const c: Movie[] = Array.isArray(data.coming_soon) ? data.coming_soon : [];
          setRunning(r);
          setComingSoon(c);
        }
      } catch {
        setRunning([]);
        setComingSoon([]);
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
                />
              ))
            )}
          </div>
        </section>

        {/* hide coming soon during search/filter to avoid empty skeletons */}
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
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {/* render modal if a movie is selected */}
      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}