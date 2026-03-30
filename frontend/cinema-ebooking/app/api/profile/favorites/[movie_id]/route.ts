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
      "X-User-Email": headers["x-user-email"] || "",
    },
  });

  return normalizeUpstreamResponse(upstream);
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
      "X-User-Email": headers["x-user-email"] || "",
    },
  });

  return normalizeUpstreamResponse(upstream);
}