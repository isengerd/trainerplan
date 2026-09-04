import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return NextResponse.json({ error: "Cross-Site-Anfrage abgelehnt." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: "Ungültiger Anfrageursprung." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/api/v1/:path*" };
