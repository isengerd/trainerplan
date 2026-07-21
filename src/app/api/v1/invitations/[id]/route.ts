import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen löschen." }, { status: user ? 403 : 401 });
  await prisma.invitation.deleteMany({ where: { id: params.id, acceptedAt: null } });
  return NextResponse.json({ ok: true });
}
