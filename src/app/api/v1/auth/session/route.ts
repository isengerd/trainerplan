import { NextRequest, NextResponse } from "next/server";
import { createFirebaseSession, firebaseAuthEnabled, safeUser, SESSION_COOKIE, sessionCookieSettings } from "@/lib/auth";
import { ApiInputError, clientIp, rateLimit, readJson } from "@/lib/api-security";

export async function POST(request: NextRequest) {
  if (!firebaseAuthEnabled()) return NextResponse.json({ error: "Firebase Authentication ist nicht aktiviert." }, { status: 503 });
  const attempt = rateLimit(`firebase-session:${clientIp(request)}`, 30, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  try {
    const body = await readJson<{ idToken?: unknown }>(request, 16_384);
    if (typeof body.idToken !== "string" || body.idToken.length < 100 || body.idToken.length > 10_000) throw new ApiInputError("Das Firebase-Token ist ungültig.");
    const session = await createFirebaseSession(body.idToken);
    const response = NextResponse.json({ user: safeUser(session.user), expiresAt: session.expiresAt.toISOString() });
    response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieSettings(request, session.expiresAt));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Die Anmeldung ist fehlgeschlagen." }, { status: error instanceof ApiInputError ? error.status : 401 });
  }
}
