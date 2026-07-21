import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSession, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiInputError, clientIp, emailValue, rateLimit, readJson } from "@/lib/api-security";

export async function POST(request: NextRequest) {
  let email: string;
  let password: string;
  try {
    const body = await readJson<{ email?: unknown; password?: unknown }>(request, 8_192);
    email = emailValue(body.email);
    if (typeof body.password !== "string" || body.password.length < 1 || body.password.length > 256) throw new ApiInputError("E-Mail oder Passwort ist nicht korrekt.");
    password = body.password;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ungültige Anmeldung.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
  const ip = clientIp(request);
  const attempt = rateLimit(`login:${ip}:${email}`, 8, 15 * 60_000);
  const ipAttempt = rateLimit(`login-ip:${ip}`, 40, 15 * 60_000);
  if (!attempt.allowed || !ipAttempt.allowed) {
    const retryAfter = Math.max(attempt.retryAfter, ipAttempt.retryAfter);
    return NextResponse.json({ error: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: safeUser(user), token: session.token, expiresAt: session.expiresAt.toISOString() });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
  return response;
}
