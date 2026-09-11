import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { activeClubScope } from "@/lib/club-context";
import { prisma } from "@/lib/db";
import { ApiInputError, apiError, emailValue, readJson } from "@/lib/api-security";
import { canInviteRole } from "@/lib/license";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { sendInvitationMail, smtpStatus } from "@/lib/smtp";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await sensitiveAuthenticatedUser(request);
    if (!actor || actor.role !== "admin") throw new ApiInputError("Nur Admins dürfen Spielerzugänge einrichten.", actor ? 403 : 401);
    const scope = await activeClubScope(actor);
    if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
    const club = await prisma.club.findUniqueOrThrow({ where: { id: scope.clubId } });
    if (!canInviteRole(club.licenseType, "player", club.licenseExpiresAt)) throw new ApiInputError("Eigene Zugänge sind für diese Lizenz nicht verfügbar.", 403);
    const { id } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: id, clubId: scope.clubId, teamId: scope.teamId, status: "active", role: "player", user: { managedProfile: true, loginEnabled: false, firebaseUid: null } }, include: { user: true } });
    if (!membership) throw new ApiInputError("Dieses Profil hat bereits einen Zugang oder ist nicht mehr in der Mannschaft.", 409);
    const body = await readJson<{ email?: unknown }>(request, 8192);
    const email = emailValue(body.email);
    if (await prisma.user.findUnique({ where: { email } })) throw new ApiInputError("Diese E-Mail gehört bereits zu einem Konto. Bitte verwende eine eigene, noch nicht zugeordnete Adresse des Spielers.", 409);
    const { token, tokenHash } = createInvitationToken();
    const link = `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}`;
    await prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { managedPlayerId: id, role: "player", clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
      await tx.invitation.create({ data: { email, name: membership.user.name, role: "player", ageGroup: membership.user.ageGroup, clubId: scope.clubId, teamId: scope.teamId, managedPlayerId: id, invitedById: actor.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    });
    let emailSent = false;
    if (smtpStatus().configured) {
      try { await sendInvitationMail({ to: email, name: membership.user.name, inviter: actor.name, clubName: club.name, link }); emailSent = true; }
      catch { /* The valid invitation remains available for manual sharing. */ }
    }
    return NextResponse.json({ link, emailSent }, { status: 201 });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await sensitiveAuthenticatedUser(request);
    if (!actor || actor.role !== "admin") throw new ApiInputError("Nur Admins dürfen Einladungen verwalten.", actor ? 403 : 401);
    const scope = await activeClubScope(actor);
    if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
    const { id } = await context.params;
    const invitations = await prisma.invitation.findMany({ where: { managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, role: "player", acceptedAt: null }, select: { id: true, email: true, name: true, role: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ invitations });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
