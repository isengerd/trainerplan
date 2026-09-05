import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { defaultPosition } from "@/data/club";
import { firebaseAuthEnabled, safeUser } from "@/lib/auth";
import { ApiInputError, clientIp, readJson } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { anonymousThrottleKey, persistentRateLimit } from "@/lib/persistent-rate-limit";
import { publicRegistrationEnabled } from "@/lib/registration-access";
import { firebaseAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  if (!publicRegistrationEnabled()) return NextResponse.json({ error: "Die öffentliche Registrierung ist derzeit geschlossen. Bitte nutze einen persönlichen Einladungslink." }, { status: 403 });
  const attempt = await persistentRateLimit(anonymousThrottleKey("register", clientIp(request)), 5, 60 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Registrierungsversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  try {
    if (!firebaseAuthEnabled()) return NextResponse.json({ error: "Diese Registrierung benötigt Firebase Authentication." }, { status: 503 });
    const body = await readJson<{ idToken?: unknown }>(request, 16_384);
    if (typeof body.idToken !== "string" || body.idToken.length < 100 || body.idToken.length > 10_000) throw new ApiInputError("Das Firebase-Token ist ungültig.");
    const auth = firebaseAdminAuth();
    if (!auth) return NextResponse.json({ error: "Firebase Authentication ist serverseitig nicht konfiguriert." }, { status: 503 });
    const decoded = await auth.verifyIdToken(body.idToken, true);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) throw new ApiInputError("Das Firebase-Konto besitzt keine E-Mail-Adresse.");
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "Für diese E-Mail-Adresse existiert bereits ein Zugang." }, { status: 409 });
    const user = await prisma.user.create({ data: { id: `user-${randomUUID()}`, firebaseUid: decoded.uid, name: decoded.name?.slice(0, 100) || "Neuer Nutzer", email, passwordHash: await bcrypt.hash(randomUUID(), 12), role: "admin", position: defaultPosition.admin } });
    return NextResponse.json({ user: safeUser(user), setupRequired: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Registrierung konnte nicht verarbeitet werden.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
}
