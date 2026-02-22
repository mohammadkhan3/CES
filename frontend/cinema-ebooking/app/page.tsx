"use client";

import { useEffect, useState } from "react";

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

function MovieCard({ movie, comingSoon }: { movie: Movie; comingSoon?: boolean }) {
  return (
    <div className="text-center">
      <div className="relative">
        {comingSoon && (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rotate-12 shadow-lg">
            COMING SOON!
          </div>
        )}

        <div className="w-full h-56 bg-zinc-900 overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className="w-full h-56 flex items-center justify-center text-white/40">
              Poster
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-4 text-2xl tracking-wide uppercase">{movie.title}</h3>
    </div>
  );
}

export default function HomePage() {
  const [running, setRunning] = useState<Movie[]>([]);
  const [comingSoon, setComingSoon] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/movies/homepage", { cache: "no-store" });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        const data = json?.data ?? {};
        const r: Movie[] = Array.isArray(data.currently_running) ? data.currently_running : [];
        const c: Movie[] = Array.isArray(data.coming_soon) ? data.coming_soon : [];

        setRunning(r);
        setComingSoon(c);
      } catch {
        setRunning([]);
        setComingSoon([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const showRunningPlaceholders = loading || running.length === 0;
  const showComingPlaceholders = loading || comingSoon.length === 0;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="font-diplomata text-5xl text-center mb-12 tracking-wide uppercase">
        Cinema E-booking System
      </h1>

      <div className="max-w-6xl mx-auto space-y-16">
        <section>
          <h2 className="text-2xl font-semibold tracking-wide mb-6">
            Currently Running
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {showRunningPlaceholders
              ? Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`running-skel-${i}`} />
                ))
              : running.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-wide mb-6">
            Coming Soon
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {showComingPlaceholders
              ? Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`coming-skel-${i}`} />
                ))
              : comingSoon.map((m) => (
                  <MovieCard key={m.id} movie={m} comingSoon />
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}