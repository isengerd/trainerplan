import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { firebaseAuthEnabled, safeUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationTokenHash } from "@/lib/invitations";
import { ApiInputError, clientIp, emailValue, readJson } from "@/lib/api-security";
import { anonymousThrottleKey, persistentRateLimit } from "@/lib/persistent-rate-limit";
import { defaultPosition } from "@/data/club";
import { firebaseAdminAuth } from "@/lib/firebase-admin";

async function invitationForToken(token: string) {
  if (!token) return null;
  return prisma.invitation.findUnique({ where: { tokenHash: invitationTokenHash(token) }, include: { group: true, team: true, club: true, managedPlayer: true } });
}

export async function GET(request: NextRequest) {
  const attempt = await persistentRateLimit(anonymousThrottleKey("invite-check", clientIp(request)), 60, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  const invitation = await invitationForToken(request.nextUrl.searchParams.get("token") || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  return NextResponse.json({ email: invitation.email, name: invitation.name, role: invitation.role, group: invitation.group?.name, team: invitation.team?.name, club: invitation.club?.name, managedPlayer: invitation.managedPlayer?.name, expiresAt: invitation.expiresAt.toISOString() });
}

export async function POST(request: NextRequest) {
  const attempt = await persistentRateLimit(anonymousThrottleKey("invite-accept", clientIp(request)), 12, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });
  let body: { token?: string; name?: string; email?: string; idToken?: string } | null = null;
  try { body = await readJson(request, 16_384); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  const invitation = await invitationForToken(body?.token || "");
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "Diese Einladung ist ungültig oder abgelaufen." }, { status: 404 });
  let accountEmail: string;
  try { accountEmail = invitation.email ? invitation.email.toLowerCase() : emailValue(body?.email); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 }); }
  if (!firebaseAuthEnabled()) return NextResponse.json({ error: "Diese Einladung benötigt Firebase Authentication." }, { status: 503 });
  if (!body?.idToken || body.idToken.length < 100 || body.idToken.length > 10_000) return NextResponse.json({ error: "Das Firebase-Token ist ungültig." }, { status: 400 });
  const auth = firebaseAdminAuth();
  if (!auth) return NextResponse.json({ error: "Firebase Authentication ist serverseitig nicht konfiguriert." }, { status: 503 });
  let decoded;
  try { decoded = await auth.verifyIdToken(body.idToken, true); }
  catch { return NextResponse.json({ error: "Die Firebase-Anmeldung ist ungültig oder wurde widerrufen." }, { status: 401 }); }
  const verifiedEmail = decoded.email?.trim().toLowerCase();
  if (!verifiedEmail || verifiedEmail !== accountEmail) return NextResponse.json({ error: "Die Einladung gehört zu einer anderen E-Mail-Adresse." }, { status: 403 });
  const existingUser = await prisma.user.findUnique({ where: { email: accountEmail } });
  if (existingUser?.firebaseUid && existingUser.firebaseUid !== decoded.uid) return NextResponse.json({ error: "Diese E-Mail-Adresse ist bereits mit einem anderen Zugang verbunden." }, { status: 409 });
  const name = body?.name?.trim() || invitation.name.trim() || accountEmail.split("@")[0]?.slice(0, 100) || "Mitglied";
  const passwordHash = await bcrypt.hash(randomUUID(), 12);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (claimed.count !== 1) throw new ApiInputError("Diese Einladung wurde bereits verwendet.", 409);
      const member = existingUser ?? await tx.user.create({ data: {
          id: `user-${randomUUID()}`,
          firebaseUid: decoded.uid,
          name: name.slice(0, 100),
          email: accountEmail,
          passwordHash,
          role: invitation.role,
          ageGroup: invitation.ageGroup,
          groupId: invitation.groupId,
          activeTeamId: invitation.teamId,
          position: defaultPosition[invitation.role],
      } });
      if (existingUser && !existingUser.firebaseUid) {
        const bound = await tx.user.updateMany({ where: { id: existingUser.id, firebaseUid: null }, data: { firebaseUid: decoded.uid } });
        if (bound.count !== 1) throw new ApiInputError("Der Zugang wurde gleichzeitig anderweitig verbunden.", 409);
      }
      if (invitation.clubId) {
        const membership = await tx.membership.findFirst({ where: { userId: member.id, clubId: invitation.clubId, teamId: invitation.teamId } });
        if (membership) {
          const keepExistingRole = (membership.role === "admin" || membership.role === "trainer") && (invitation.role === "guardian" || invitation.role === "player");
          await tx.membership.update({ where: { id: membership.id }, data: { role: keepExistingRole ? membership.role : invitation.role, groupId: invitation.groupId, status: "active" } });
        }
        else await tx.membership.create({ data: { userId: member.id, clubId: invitation.clubId, teamId: invitation.teamId, role: invitation.role, groupId: invitation.groupId } });
        if (!member.activeTeamId && invitation.teamId) await tx.user.update({ where: { id: member.id }, data: { activeTeamId: invitation.teamId } });
      }
      if (invitation.managedPlayerId) await tx.guardianPlayer.upsert({ where: { guardianId_playerId: { guardianId: member.id, playerId: invitation.managedPlayerId } }, update: {}, create: { guardianId: member.id, playerId: invitation.managedPlayerId } });
      return member;
    });
  } catch (error) {
    if (error instanceof ApiInputError || error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Diese Einladung wurde bereits verwendet oder der Zugang existiert schon." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ user: safeUser(user) });
}
