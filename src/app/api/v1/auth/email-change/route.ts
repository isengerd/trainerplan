import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { ApiInputError, emailValue, rateLimit, readJson } from "@/lib/api-security";
import { sendEmailChangeMail, smtpStatus } from "@/lib/smtp";

export async function POST(request: NextRequest) {
  const actor = await authenticatedUser(request);
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const attempt = rateLimit(`email-change:${actor.id}`, actor.role === "admin" ? 20 : 5, 60 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Änderungsversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });

  let body: { targetUserId?: unknown; newEmail?: unknown; currentPassword?: unknown };
  try { body = await readJson(request, 16_384); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }

  let newEmail: string;
  try { newEmail = emailValue(body.newEmail); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige E-Mail-Adresse." }, { status: 400 }); }
  const requestedTargetId = typeof body.targetUserId === "string" ? body.targetUserId : actor.id;
  if (requestedTargetId !== actor.id && actor.role !== "admin") return NextResponse.json({ error: "Nur Vereinsadmins dürfen E-Mail-Änderungen für andere Mitglieder anstoßen." }, { status: 403 });
  const targetUser = requestedTargetId === actor.id ? actor : await prisma.user.findUnique({ where: { id: requestedTargetId } });
  if (!targetUser) return NextResponse.json({ error: "Das Mitglied wurde nicht gefunden." }, { status: 404 });
  if (newEmail === targetUser.email) return NextResponse.json({ error: "Diese E-Mail-Adresse wird bereits verwendet." }, { status: 400 });
  if (typeof body.currentPassword !== "string" || body.currentPassword.length > 256 || !(await bcrypt.compare(body.currentPassword, actor.passwordHash))) return NextResponse.json({ error: requestedTargetId === actor.id ? "Das aktuelle Passwort ist nicht korrekt." : "Das Admin-Passwort ist nicht korrekt." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email: newEmail } })) return NextResponse.json({ error: "Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet." }, { status: 409 });
  if (!smtpStatus().configured) return NextResponse.json({ error: "E-Mail-Versand ist noch nicht eingerichtet. Die Adresse wurde nicht geändert." }, { status: 503 });

  let baseUrl: string;
  try { baseUrl = applicationUrl(request); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Anwendungs-URL ist nicht konfiguriert." }, { status: 503 }); }

  const { token, tokenHash } = createInvitationToken();
  await prisma.emailChangeRequest.deleteMany({ where: { userId: targetUser.id, usedAt: null } });
  const change = await prisma.emailChangeRequest.create({ data: { userId: targetUser.id, newEmail, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) } });
  const link = `${baseUrl}/email-bestaetigen?token=${encodeURIComponent(token)}`;
  try {
    await sendEmailChangeMail({ to: newEmail, name: targetUser.name, link, requestedBy: targetUser.id === actor.id ? undefined : actor.name });
  } catch {
    await prisma.emailChangeRequest.delete({ where: { id: change.id } });
    return NextResponse.json({ error: "Die Bestätigungs-E-Mail konnte nicht versendet werden. Die Adresse wurde nicht geändert." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: `Bestätigungslink wurde an ${newEmail} gesendet.` });
}
