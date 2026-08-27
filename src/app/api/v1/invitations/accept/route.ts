import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, createSession, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationTokenHash } from "@/lib/invitations";
import { ApiInputError, clientIp, rateLimit, readJson } from "@/lib/api-security";
import { defaultPosition } from "@/data/club";

async function invitationForToken(token: string) {
  if (!token) return null;
  return prisma.invitation.findUnique({ where: { tokenHash: invitationTokenHash(token) }, include: { group: true, team: true, club: true } });
}

export async function GET(request: NextRequest) {
  const attempt = rateLimit(`invite-check:${clientIp(request)}`, 60, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  const invitation = await invitationForToken(request.nextUrl.searchParams.get("token") || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  return NextResponse.json({ email: invitation.email, name: invitation.name, role: invitation.role, group: invitation.group?.name, team: invitation.team?.name, club: invitation.club?.name, expiresAt: invitation.expiresAt.toISOString() });
}

export async function POST(request: NextRequest) {
  const attempt = rateLimit(`invite-accept:${clientIp(request)}`, 12, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  let body: { token?: string; name?: string; password?: string } | null = null;
  try { body = await readJson(request, 16_384); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  const invitation = await invitationForToken(body?.token || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  const name = body?.name?.trim() || invitation.name;
  if (name.length < 2) return NextResponse.json({ error: "Bitte den Namen angeben." }, { status: 400 });
  if (!body?.password || body.password.length < 12 || body.password.length > 256) return NextResponse.json({ error: "Das Passwort benötigt 12 bis 256 Zeichen." }, { status: 400 });
  const currentUser = await authenticatedUser(request);
  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existingUser && (!currentUser || currentUser.id !== existingUser.id)) {
    if (!body?.password || !(await bcrypt.compare(body.password, existingUser.passwordHash))) return NextResponse.json({ error: "Bitte nutze das Passwort des bestehenden Zugangs, um die Einladung anzunehmen." }, { status: 401 });
  }
  if (currentUser && existingUser && currentUser.id !== existingUser.id) return NextResponse.json({ error: "Die Einladung gehört zu einer anderen E-Mail-Adresse." }, { status: 403 });

  const passwordHash = await bcrypt.hash(body.password, 12);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (claimed.count !== 1) throw new ApiInputError("Diese Einladung wurde bereits verwendet.", 409);
      const member = existingUser ?? await tx.user.create({ data: {
          id: `user-${randomUUID()}`,
          name: name.slice(0, 100),
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          ageGroup: invitation.ageGroup,
          groupId: invitation.groupId,
          position: defaultPosition[invitation.role],
      } });
      if (invitation.clubId) {
        const membership = await tx.membership.findFirst({ where: { userId: member.id, clubId: invitation.clubId, teamId: invitation.teamId } });
        if (membership) await tx.membership.update({ where: { id: membership.id }, data: { role: invitation.role, status: "active" } });
        else await tx.membership.create({ data: { userId: member.id, clubId: invitation.clubId, teamId: invitation.teamId, role: invitation.role } });
      }
      return member;
    });
  } catch (error) {
    if (error instanceof ApiInputError || error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Diese Einladung wurde bereits verwendet oder der Zugang existiert schon." }, { status: 409 });
    }
    throw error;
  }
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: safeUser(user) });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
  return response;
}
