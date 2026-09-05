import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeClubScope } from "@/lib/club-context";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungslinks erneuern." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Keine aktive Mannschaft." }, { status: 409 });
  const invitation = await prisma.invitation.findFirst({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
  if (!invitation) return NextResponse.json({ error: "Die Einladung wurde nicht gefunden." }, { status: 404 });
  const { token, tokenHash } = createInvitationToken();
  const link = `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}`;
  await prisma.invitation.update({ where: { id }, data: { tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  return NextResponse.json({ link });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einladungen löschen." }, { status: user ? 403 : 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Keine aktive Mannschaft." }, { status: 409 });
  await prisma.invitation.deleteMany({ where: { id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
  return NextResponse.json({ ok: true });
}
