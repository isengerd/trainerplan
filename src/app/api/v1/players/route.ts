import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, emailValue, readJson, textValue } from "@/lib/api-security";
import { activeClubScope, ensureClubConfig } from "@/lib/club-context";
import { prisma } from "@/lib/db";
import { ageGroupForBirthday } from "@/lib/age-groups";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { sendInvitationMail, smtpStatus } from "@/lib/smtp";
import type { ClubSettings } from "@/data/club";

export async function POST(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Kinderprofile anlegen." }, { status: user ? 403 : 401 });
  try {
    const body = await readJson<{ name?: unknown; birthday?: unknown; guardianName?: unknown; guardianEmail?: unknown; sendEmail?: boolean }>(request, 32_000);
    const name = textValue(body.name, "Name des Kindes", 100, 2);
    const birthday = textValue(body.birthday, "Geburtsdatum", 10, 10);
    const parsedBirthday = new Date(`${birthday}T12:00:00Z`);
    if (Number.isNaN(parsedBirthday.getTime()) || parsedBirthday.toISOString().slice(0, 10) !== birthday || parsedBirthday >= new Date()) throw new ApiInputError("Bitte gib ein gültiges Geburtsdatum an.");
    const guardianEmail = body.guardianEmail ? emailValue(body.guardianEmail) : null;
    const guardianName = typeof body.guardianName === "string" ? body.guardianName.trim().slice(0, 100) : "";
    const scope = await activeClubScope(user);
    if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
    const existingGuardian = guardianEmail ? await prisma.user.findUnique({ where: { email: guardianEmail } }) : null;
    if (existingGuardian?.managedProfile) throw new ApiInputError("Diese Adresse gehört zu einem Spielerprofil.");
    const tokenData = existingGuardian ? null : createInvitationToken();
    const baseUrl = tokenData ? applicationUrl(request) : null;
    const playerId = `player-${randomUUID()}`;
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.user.create({ data: { id: playerId, name, email: `${playerId}@profiles.invalid`, passwordHash: await bcrypt.hash(randomUUID(), 12), role: "player", position: "Allrounder", birthday: parsedBirthday, ageGroup: ageGroupForBirthday(parsedBirthday) ?? "", activeTeamId: scope.teamId, managedProfile: true, loginEnabled: false } });
      await tx.membership.create({ data: { userId: player.id, clubId: scope.clubId, teamId: scope.teamId, role: "player" } });
      if (existingGuardian) {
        await tx.guardianPlayer.upsert({ where: { guardianId_playerId: { guardianId: existingGuardian.id, playerId: player.id } }, update: {}, create: { guardianId: existingGuardian.id, playerId: player.id } });
        const membership = await tx.membership.findFirst({ where: { userId: existingGuardian.id, clubId: scope.clubId, teamId: scope.teamId } });
        if (!membership) await tx.membership.create({ data: { userId: existingGuardian.id, clubId: scope.clubId, teamId: scope.teamId, role: "guardian" } });
      } else if (tokenData) {
        if (guardianEmail) await tx.invitation.deleteMany({ where: { email: guardianEmail, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
        await tx.invitation.create({ data: { email: guardianEmail ?? "", name: guardianName, role: "guardian", ageGroup: "", clubId: scope.clubId, teamId: scope.teamId, managedPlayerId: player.id, invitedById: user.id, tokenHash: tokenData.tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) } });
      }
      return player;
    });
    const link = tokenData && baseUrl ? `${baseUrl}/einladung?token=${encodeURIComponent(tokenData.token)}` : undefined;
    let emailSent = false;
    let emailError: string | undefined;
    if (guardianEmail && link && body.sendEmail) {
      const config = await ensureClubConfig(scope);
      const settings = config?.settings as unknown as ClubSettings | undefined;
      if (!smtpStatus().configured) emailError = "SMTP ist nicht konfiguriert. Der Einladungslink kann trotzdem kopiert werden.";
      else try { await sendInvitationMail({ to: guardianEmail, name: guardianName, inviter: user.name, clubName: settings?.clubName ?? "deinem Verein", link }); emailSent = true; }
      catch { emailError = "Die Eltern-E-Mail konnte nicht versendet werden. Der Link kann trotzdem kopiert werden."; }
    }
    return NextResponse.json({ player: { id: result.id, name: result.name }, link, emailSent, emailError }, { status: 201 });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
