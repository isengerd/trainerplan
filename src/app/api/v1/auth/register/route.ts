import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { defaultPosition } from "@/data/club";
import { createSession, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { ApiInputError, clientIp, emailValue, rateLimit, readJson } from "@/lib/api-security";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const attempt = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Registrierungsversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request, 8_192);
    const email = emailValue(body.email);
    if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256) throw new ApiInputError("Das Passwort benötigt 12 bis 256 Zeichen.");
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "Für diese E-Mail-Adresse existiert bereits ein Zugang." }, { status: 409 });
    const user = await prisma.user.create({ data: { id: `user-${randomUUID()}`, name: "Neuer Nutzer", email, passwordHash: await bcrypt.hash(body.password, 12), role: "admin", position: defaultPosition.admin } });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: safeUser(user), setupRequired: true, token: session.token, expiresAt: session.expiresAt.toISOString() }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Registrierung konnte nicht verarbeitet werden.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
}
