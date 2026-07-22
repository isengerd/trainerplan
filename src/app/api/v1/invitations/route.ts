import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applicationUrl, createInvitationToken, invitationDto } from "@/lib/invitations";
import { sendInvitationMail, smtpStatus } from "@/lib/smtp";
import type { ClubSettings } from "@/data/club";
import { ApiInputError, emailValue, readJson, textValue } from "@/lib/api-security";

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen erstellen." }, { status: user ? 403 : 401 });
  let body: { email?: unknown; name?: unknown; role?: Role; ageGroupId?: unknown; groupId?: unknown; sendEmail?: boolean };
  try { body = await readJson(request, 32_000); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  let email: string;
  try { email = emailValue(body.email); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige E-Mail-Adresse." }, { status: 400 }); }
  if (!body?.role || !Object.values(Role).includes(body.role)) return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Diese Person ist bereits Mitglied." }, { status: 409 });
  const groupId = body.groupId ? textValue(body.groupId, "Gruppe", 100, 1) : null;
  if (groupId && !(await prisma.teamGroup.findUnique({ where: { id: groupId } }))) return NextResponse.json({ error: "Die ausgewählte Gruppe existiert nicht." }, { status: 400 });
  const settings = (await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" } })).settings as unknown as ClubSettings;
  const enabledAgeGroupIds = settings.ageGroupIds?.length ? settings.ageGroupIds : ["f-jugend"];
  const ageGroupId = body.role === "player" ? textValue(body.ageGroupId, "Altersklasse", 100, 1) : enabledAgeGroupIds[0];
  if (!enabledAgeGroupIds.includes(ageGroupId)) return NextResponse.json({ error: "Diese Altersklasse ist nicht aktiviert." }, { status: 400 });
  const ageGroup = await prisma.ageGroup.findUnique({ where: { id: ageGroupId } });
  if (!ageGroup) return NextResponse.json({ error: "Die ausgewählte Altersklasse existiert nicht." }, { status: 400 });

  await prisma.invitation.deleteMany({ where: { email, acceptedAt: null } });
  const { token, tokenHash } = createInvitationToken();
  const invitation = await prisma.invitation.create({
    data: { email, name: typeof body.name === "string" ? body.name.trim().slice(0, 100) : "", role: body.role, ageGroup: ageGroup.name, groupId, invitedById: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) },
    include: { invitedBy: { select: { name: true } } },
  });
  let baseUrl: string;
  try { baseUrl = applicationUrl(request); }
  catch (error) {
    await prisma.invitation.delete({ where: { id: invitation.id } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Einladungs-URL ist nicht konfiguriert." }, { status: 503 });
  }
  const link = `${baseUrl}/einladung?token=${encodeURIComponent(token)}`;
  let emailSent = false;
  let emailError: string | undefined;
  if (body.sendEmail) {
    if (!smtpStatus().configured) emailError = "SMTP ist nicht konfiguriert. Der Link kann trotzdem kopiert werden.";
    else try {
      await sendInvitationMail({ to: email, name: invitation.name, inviter: user.name, clubName: settings.clubName, link });
      emailSent = true;
    } catch { emailError = "E-Mail konnte nicht gesendet werden. Bitte SMTP-Konfiguration prüfen."; }
  }
  return NextResponse.json({ invitation: invitationDto(invitation), link, emailSent, emailError }, { status: 201 });
}
