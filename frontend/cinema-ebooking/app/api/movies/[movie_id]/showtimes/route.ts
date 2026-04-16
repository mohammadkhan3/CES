import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

type RouteParams = {
  params: Promise<{
    movie_id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  const { movie_id } = await params;

  const upstream = await fetch(
    `${BACKEND_BASE}/api/movies/${encodeURIComponent(movie_id)}/showtimes`,
    {
      cache: "no-store",
    }
  );

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
