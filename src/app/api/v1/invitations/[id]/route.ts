import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen löschen." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  await prisma.invitation.deleteMany({ where: { id, acceptedAt: null } });
  return NextResponse.json({ ok: true });
}
