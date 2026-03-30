import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "john@example.com";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ movie_id: string }> }
) {
  const { movie_id } = await params;
  const headers = Object.fromEntries(req.headers);

  const upstream = await fetch(`${BACKEND_BASE}/api/profile/favorites/${movie_id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || USER_EMAIL,
    },
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ movie_id: string }> }
) {
  const { movie_id } = await params;
  const headers = Object.fromEntries(req.headers);

  const upstream = await fetch(`${BACKEND_BASE}/api/profile/favorites/${movie_id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || USER_EMAIL,
    },
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}