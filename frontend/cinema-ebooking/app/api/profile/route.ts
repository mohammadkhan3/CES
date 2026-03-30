import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL ?? "http://localhost:5000";

async function normalizeUpstreamResponse(upstream: Response) {
  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    JSON.parse(text);
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { message: text || "No response body" },
      { status: upstream.status }
    );
  }
}

export async function GET(req: Request) {
  const headers = Object.fromEntries(req.headers);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_BASE}/api/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": headers["x-user-email"] || "",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    return NextResponse.json({ message: "Profile service unavailable" }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }

  return normalizeUpstreamResponse(upstream);
}

export async function PUT(req: Request) {
  const headers = Object.fromEntries(req.headers);
  const body = await req.text();

  const upstream = await fetch(`${BACKEND_BASE}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": headers["x-user-email"] || "",
    },
    body,
  });

  return normalizeUpstreamResponse(upstream);
}