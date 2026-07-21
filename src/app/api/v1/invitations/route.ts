import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applicationUrl, createInvitationToken, invitationDto } from "@/lib/invitations";
import { sendInvitationMail, smtpStatus } from "@/lib/smtp";
import type { ClubSettings } from "@/data/club";

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen erstellen." }, { status: user ? 403 : 401 });
  const body = await request.json().catch(() => null) as { email?: string; name?: string; role?: Role; groupId?: string | null; sendEmail?: boolean } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  if (!body?.role || !Object.values(Role).includes(body.role)) return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Diese Person ist bereits Mitglied." }, { status: 409 });
  if (body.groupId && !(await prisma.teamGroup.findUnique({ where: { id: body.groupId } }))) return NextResponse.json({ error: "Die ausgewählte Gruppe existiert nicht." }, { status: 400 });

  await prisma.invitation.deleteMany({ where: { email, acceptedAt: null } });
  const { token, tokenHash } = createInvitationToken();
  const invitation = await prisma.invitation.create({
    data: { email, name: body.name?.trim().slice(0, 100) || "", role: body.role, groupId: body.groupId || null, invitedById: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) },
    include: { invitedBy: { select: { name: true } } },
  });
  const link = `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}`;
  let emailSent = false;
  let emailError: string | undefined;
  if (body.sendEmail) {
    if (!smtpStatus().configured) emailError = "SMTP ist nicht konfiguriert. Der Link kann trotzdem kopiert werden.";
    else try {
      const config = await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" } });
      const settings = config.settings as unknown as ClubSettings;
      await sendInvitationMail({ to: email, name: invitation.name, inviter: user.name, clubName: settings.clubName, link });
      emailSent = true;
    } catch (error) { emailError = error instanceof Error ? error.message : "E-Mail konnte nicht gesendet werden."; }
  }
  return NextResponse.json({ invitation: invitationDto(invitation), link, emailSent, emailError }, { status: 201 });
}
