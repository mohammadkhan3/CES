import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE =
  process.env.BACKEND_BASE || "http://127.0.0.1:5000";

export async function POST(req: NextRequest) {
  const userEmail = req.headers.get("X-User-Email");

  const res = await fetch(`${BACKEND_BASE}/api/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail || "",
    },
    cache: "no-store",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}