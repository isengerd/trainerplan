import { NextRequest, NextResponse } from "next/server";
import { createFirebaseSession, firebaseAuthEnabled, safeUser, SESSION_COOKIE, sessionCookieSettings } from "@/lib/auth";
import { clientIp, emailValue, readJson } from "@/lib/api-security";
import { redeemFirebaseEmailLink } from "@/lib/firebase-email-link";
import { anonymousThrottleKey, persistentRateLimit } from "@/lib/persistent-rate-limit";

export async function POST(request: NextRequest) {
  if (!firebaseAuthEnabled()) return NextResponse.json({ error: "Die passwortlose Anmeldung ist nicht aktiviert." }, { status: 503 });
  const attempt = await persistentRateLimit(anonymousThrottleKey("email-link-verify", clientIp(request)), 10, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Anmeldeversuche. Bitte fordere später einen neuen Link an." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });

  try {
    const body = await readJson<{ email?: unknown; oobCode?: unknown }>(request, 16_384);
    const email = emailValue(body.email);
    if (typeof body.oobCode !== "string" || body.oobCode.length < 20 || body.oobCode.length > 2_048) throw new Error("invalid code");
    const idToken = await redeemFirebaseEmailLink(email, body.oobCode);
    const session = await createFirebaseSession(idToken);
    const response = NextResponse.json({ user: safeUser(session.user), expiresAt: session.expiresAt.toISOString() });
    response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieSettings(request, session.expiresAt));
    return response;
  } catch {
    return NextResponse.json({ error: "Der Anmeldelink ist ungültig, abgelaufen oder gehört zu einer anderen E-Mail-Adresse." }, { status: 401 });
  }
}
