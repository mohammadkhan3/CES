import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

export async function GET(req: Request) {
  const headers = Object.fromEntries(req.headers);
  const upstream = await fetch(`${BACKEND_BASE}/api/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || "",
    },
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}