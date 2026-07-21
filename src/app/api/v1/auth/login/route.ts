import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSession, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({ email: "", password: "" })) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "E-Mail oder Passwort ist nicht korrekt." }, { status: 401 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: safeUser(user), token: session.token, expiresAt: session.expiresAt.toISOString() });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
  return response;
}
