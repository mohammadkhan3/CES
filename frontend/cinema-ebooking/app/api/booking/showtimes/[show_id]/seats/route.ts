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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ show_id: string }> }
) {
  const { show_id } = await params;

  const upstream = await fetch(
    `${BACKEND_BASE}/api/booking/showtimes/${show_id}/seats`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  return normalizeUpstreamResponse(upstream);
}