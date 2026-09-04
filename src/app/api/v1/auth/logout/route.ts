import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE, sessionCookieSettings } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await revokeSession(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieSettings(request), maxAge: 0 });
  return response;
}
