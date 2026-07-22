import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { invitationTokenHash } from "@/lib/invitations";
import { ApiInputError, clientIp, rateLimit, readJson } from "@/lib/api-security";

export async function POST(request: NextRequest) {
  const attempt = rateLimit(`email-confirm:${clientIp(request)}`, 20, 15 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429 });
  let body: { token?: unknown };
  try { body = await readJson(request, 8_192); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  if (typeof body.token !== "string" || body.token.length < 20 || body.token.length > 200) return NextResponse.json({ error: "Der Bestätigungslink ist ungültig." }, { status: 400 });

  const change = await prisma.emailChangeRequest.findUnique({ where: { tokenHash: invitationTokenHash(body.token) } });
  if (!change || change.usedAt || change.expiresAt <= new Date()) return NextResponse.json({ error: "Der Bestätigungslink ist ungültig oder abgelaufen." }, { status: 404 });
  if (await prisma.user.findUnique({ where: { email: change.newEmail } })) return NextResponse.json({ error: "Die E-Mail-Adresse wird inzwischen bereits verwendet." }, { status: 409 });

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.emailChangeRequest.updateMany({ where: { id: change.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new ApiInputError("Dieser Bestätigungslink wurde bereits verwendet.", 409);
      await tx.user.update({ where: { id: change.userId }, data: { email: change.newEmail } });
      await tx.apiSession.deleteMany({ where: { userId: change.userId } });
    });
  } catch (error) {
    if (error instanceof ApiInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Die E-Mail-Adresse wird bereits verwendet." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ ok: true, message: "E-Mail-Adresse bestätigt. Bitte melde dich mit der neuen Adresse erneut an." });
}
