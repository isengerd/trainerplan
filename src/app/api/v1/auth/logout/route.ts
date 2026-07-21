import { NextRequest, NextResponse } from "next/server";
import { requestUsesHttps, revokeSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await revokeSession(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", maxAge: 0 });
  return response;
}
