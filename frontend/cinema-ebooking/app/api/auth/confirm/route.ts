import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const upstream = await fetch(`${BACKEND_BASE}/api/auth/confirm/${token}`, {
    method: "GET",
  });

  const data = await upstream.json();
  return NextResponse.json(
    { ...data, ok: upstream.status === 200 },
    { status: upstream.status }
  );
}