import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, revokeOtherSessions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiInputError, readJson } from "@/lib/api-security";

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  let currentPassword: string | undefined;
  let newPassword: string | undefined;
  let confirmation: string | undefined;
  try {
    ({ currentPassword, newPassword, confirmation } = await readJson<{ currentPassword?: string; newPassword?: string; confirmation?: string }>(request, 8_192));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  if (!currentPassword || currentPassword.length > 256 || !newPassword || newPassword.length < 12 || newPassword.length > 256) return NextResponse.json({ error: "Das neue Passwort benötigt 12 bis 256 Zeichen." }, { status: 400 });
  if (newPassword !== confirmation) return NextResponse.json({ error: "Die beiden neuen Passwörter stimmen nicht überein." }, { status: 400 });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Das aktuelle Passwort ist nicht korrekt." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  await revokeOtherSessions(request, user.id);
  return NextResponse.json({ ok: true });
}
