import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

export async function GET() {
  const upstream = await fetch(`${BACKEND_BASE}/api/movies/homepage`, {
    cache: "no-store",
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}