import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeClubScope } from "@/lib/club-context";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen löschen." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Keine aktive Mannschaft." }, { status: 409 });
  await prisma.invitation.deleteMany({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
  return NextResponse.json({ ok: true });
}
