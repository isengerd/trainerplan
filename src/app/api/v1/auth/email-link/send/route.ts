import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { firebaseAuthEnabled } from "@/lib/auth";
import { clientIp, emailValue, readJson } from "@/lib/api-security";
import { requestFirebaseEmailLink } from "@/lib/firebase-email-link";
import { anonymousThrottleKey, persistentRateLimit } from "@/lib/persistent-rate-limit";

const GENERIC_MESSAGE = "Wenn für diese E-Mail-Adresse ein aktiver Zugang besteht, wurde ein Anmeldelink versendet.";
const MINIMUM_RESPONSE_MS = 700;

export async function POST(request: NextRequest) {
  if (!firebaseAuthEnabled()) return NextResponse.json({ error: "Die passwortlose Anmeldung ist nicht aktiviert." }, { status: 503 });
  const startedAt = Date.now();
  const ipAttempt = await persistentRateLimit(anonymousThrottleKey("email-link-ip", clientIp(request)), 8, 15 * 60_000);
  if (!ipAttempt.allowed) return NextResponse.json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429, headers: { "Retry-After": String(ipAttempt.retryAfter) } });

  try {
    const body = await readJson<{ email?: unknown }>(request, 4_096);
    const email = emailValue(body.email);
    const emailAttempt = await persistentRateLimit(anonymousThrottleKey("email-link-address", email), 3, 15 * 60_000);
    if (!emailAttempt.allowed) return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 });

    const account = await prisma.user.findUnique({ where: { email }, select: { loginEnabled: true } });
    if (account?.loginEnabled) {
      await requestFirebaseEmailLink(email).catch((error) => console.error("Passwordless email could not be sent", error instanceof Error ? error.message : "unknown"));
    }
    const remaining = MINIMUM_RESPONSE_MS - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
}
