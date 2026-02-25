import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q");
  const genre = searchParams.get("genre");

  let upstreamUrl = `${BACKEND_BASE}/api/movies/homepage`;

  if (q) {
    upstreamUrl = `${BACKEND_BASE}/api/movies/search?title=${encodeURIComponent(q)}`;
  } else if (genre) {
    upstreamUrl = `${BACKEND_BASE}/api/movies/filter?genre=${encodeURIComponent(genre)}`;
  }

  const upstream = await fetch(upstreamUrl, {
    cache: "no-store",
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}