import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeClubScope, ensureClubConfig } from "@/lib/club-context";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { canInviteRole } from "@/lib/license";
import { sendInvitationMail, smtpStatus } from "@/lib/smtp";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungslinks erneuern." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Keine aktive Mannschaft." }, { status: 409 });
  const club = await prisma.club.findUnique({ where: { id: scope.clubId }, select: { licenseType: true, licenseExpiresAt: true } });
  const invitation = await prisma.invitation.findFirst({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null }, include: { invitedBy: { select: { name: true } } } });
  if (!invitation) return NextResponse.json({ error: "Die Einladung wurde nicht gefunden." }, { status: 404 });
  if (!club || !canInviteRole(club.licenseType, invitation.role, club.licenseExpiresAt)) return NextResponse.json({ error: "Diese Einladung benötigt EM Pro oder die Vereinslizenz." }, { status: 403 });
  const { token, tokenHash } = createInvitationToken();
  const link = `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}`;
  const renewed = await prisma.invitation.updateMany({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null }, data: { tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  if (renewed.count !== 1) return NextResponse.json({ error: "Diese Einladung wurde inzwischen angenommen oder zurückgenommen." }, { status: 409 });
  let emailSent = false;
  let emailError: string | undefined;
  if (invitation.email) {
    const config = await ensureClubConfig(scope);
    const settings = config?.settings as { clubName?: string } | undefined;
    if (!smtpStatus().configured) emailError = "SMTP ist nicht konfiguriert. Der erneuerte Link wurde kopiert.";
    else try {
      await sendInvitationMail({ to: invitation.email, name: invitation.name, inviter: invitation.invitedBy.name, clubName: settings?.clubName ?? "deinem Verein", link });
      emailSent = true;
    } catch { emailError = "Die Einladung konnte nicht per E-Mail gesendet werden. Der erneuerte Link wurde kopiert."; }
  }
  return NextResponse.json({ link, emailSent, emailError });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen löschen." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Keine aktive Mannschaft." }, { status: 409 });
  const removed = await prisma.invitation.deleteMany({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
  if (removed.count !== 1) return NextResponse.json({ error: "Diese Einladung wurde bereits angenommen oder zurückgenommen." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
