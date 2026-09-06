import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, emailValue, readJson } from "@/lib/api-security";
import { activeClubScope } from "@/lib/club-context";
import { prisma } from "@/lib/db";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";
import { hasAccessManagement } from "@/lib/license";

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
    await prisma.invitation.deleteMany({ where: { managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
    await prisma.invitation.create({ data: { email, name: "", role: "guardian", ageGroup: "", clubId: scope.clubId, teamId: scope.teamId, managedPlayerId: id, invitedById: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    return NextResponse.json({ link: `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}` }, { status: 201 });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
