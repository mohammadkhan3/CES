import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? "john@example.com";

export async function GET(req: Request) {
  const headers = Object.fromEntries(req.headers);
  const upstream = await fetch(`${BACKEND_BASE}/api/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || USER_EMAIL,
    },
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(req: Request) {
  const headers = Object.fromEntries(req.headers);
  const body = await req.text();

  const upstream = await fetch(`${BACKEND_BASE}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || USER_EMAIL,
    },
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}