import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, emailValue, readJson } from "@/lib/api-security";
import { activeClubScope } from "@/lib/club-context";
import { prisma } from "@/lib/db";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { hasAccessManagement } from "@/lib/license";

async function managedChild(request: NextRequest, id: string) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") throw new ApiInputError("Nur Admins dürfen Elternzugänge verwalten.", user ? 403 : 401);
  const scope = await activeClubScope(user);
  if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
  const membership = await prisma.membership.findFirst({ where: { userId: id, clubId: scope.clubId, teamId: scope.teamId, status: "active", user: { managedProfile: true } } });
  if (!membership) throw new ApiInputError("Das Kinderprofil wurde nicht gefunden.", 404);
  return { user, scope };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { scope } = await managedChild(request, id);
    const [links, invitations] = await Promise.all([
      prisma.guardianPlayer.findMany({ where: { playerId: id, guardian: { memberships: { some: { clubId: scope.clubId, teamId: scope.teamId, status: "active", role: "guardian" } } } }, include: { guardian: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.invitation.findMany({ where: { managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, expiresAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
    return NextResponse.json({ guardians: links.map(({ guardian }) => guardian), invitations });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Zugänge einrichten." }, { status: user ? 403 : 401 });
  try {
    const scope = await activeClubScope(user);
    if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
    const club = await prisma.club.findUniqueOrThrow({ where: { id: scope.clubId }, select: { licenseType: true, licenseExpiresAt: true } });
    if (!hasAccessManagement(club.licenseType, club.licenseExpiresAt)) throw new ApiInputError("Zugänge benötigen EM Pro oder die Vereinslizenz.", 403);
    const { id } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { userId: id, clubId: scope.clubId, teamId: scope.teamId, status: "active", user: { managedProfile: true } }, include: { user: true } });
    if (!membership) throw new ApiInputError("Das Kinderprofil wurde nicht gefunden.", 404);
    const body = await readJson<{ email?: unknown }>(request, 8_192);
    const email = body.email ? emailValue(body.email) : "";
    const { token, tokenHash } = createInvitationToken();
    const existingGuardian = email ? await prisma.guardianPlayer.findFirst({ where: { playerId: id, guardian: { email } } }) : null;
    if (existingGuardian) throw new ApiInputError("Dieses Elternteil ist bereits mit dem Kind verbunden.", 409);
    await prisma.invitation.deleteMany({ where: { managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null, email } });
    await prisma.invitation.create({ data: { email, name: "", role: "guardian", ageGroup: "", clubId: scope.clubId, teamId: scope.teamId, managedPlayerId: id, invitedById: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    return NextResponse.json({ link: `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}` }, { status: 201 });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { scope } = await managedChild(request, id);
    const body = await readJson<{ guardianId?: unknown; invitationId?: unknown }>(request, 8_192);
    const guardianId = typeof body.guardianId === "string" ? body.guardianId : "";
    const invitationId = typeof body.invitationId === "string" ? body.invitationId : "";
    if (!guardianId && !invitationId) throw new ApiInputError("Elternzugang fehlt.");
    if (invitationId) {
      await prisma.invitation.deleteMany({ where: { id: invitationId, managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
    } else {
      await prisma.guardianPlayer.deleteMany({ where: { guardianId, playerId: id } });
      const otherChildrenInTeam = await prisma.guardianPlayer.count({ where: { guardianId, player: { memberships: { some: { clubId: scope.clubId, teamId: scope.teamId, status: "active", role: "player" } } } } });
      if (otherChildrenInTeam === 0) await prisma.membership.deleteMany({ where: { userId: guardianId, clubId: scope.clubId, teamId: scope.teamId, role: "guardian" } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
