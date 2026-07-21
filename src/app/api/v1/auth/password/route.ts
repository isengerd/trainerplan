import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { currentPassword, newPassword } = await request.json() as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 8) return NextResponse.json({ error: "Das neue Passwort benötigt mindestens acht Zeichen." }, { status: 400 });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Das aktuelle Passwort ist nicht korrekt." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  return NextResponse.json({ ok: true });
}
