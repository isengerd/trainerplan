import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSession, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationTokenHash } from "@/lib/invitations";

async function invitationForToken(token: string) {
  if (!token) return null;
  return prisma.invitation.findUnique({ where: { tokenHash: invitationTokenHash(token) }, include: { group: true } });
}

export async function GET(request: NextRequest) {
  const invitation = await invitationForToken(request.nextUrl.searchParams.get("token") || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  return NextResponse.json({ email: invitation.email, name: invitation.name, role: invitation.role, group: invitation.group?.name, expiresAt: invitation.expiresAt.toISOString() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { token?: string; name?: string; password?: string } | null;
  const invitation = await invitationForToken(body?.token || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  const name = body?.name?.trim() || invitation.name;
  if (name.length < 2) return NextResponse.json({ error: "Bitte den Namen angeben." }, { status: 400 });
  if (!body?.password || body.password.length < 8) return NextResponse.json({ error: "Das Passwort benötigt mindestens 8 Zeichen." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email: invitation.email } })) return NextResponse.json({ error: "Für diese E-Mail-Adresse existiert bereits ein Zugang." }, { status: 409 });

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: {
      id: `user-${randomUUID()}`,
      name: name.slice(0, 100),
      email: invitation.email,
      passwordHash: await bcrypt.hash(body.password!, 12),
      role: invitation.role,
      groupId: invitation.groupId,
      position: invitation.role === "player" ? "Spieler/in" : invitation.role === "trainer" ? "Trainer/in" : "Administration",
    } });
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return created;
  });
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: safeUser(user) });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
  return response;
}
