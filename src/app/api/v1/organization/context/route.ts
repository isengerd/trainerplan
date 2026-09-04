import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, readJson, textValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { organizationContext, requireClubAdmin } from "@/lib/organization";

export async function PUT(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const body = await readJson<{ teamId?: unknown }>(request, 8_192);
    const teamId = textValue(body.teamId, "Mannschaft", 120, 1);
    const current = await organizationContext(user.id);
    if (!current) throw new ApiInputError("Kein Verein eingerichtet.", 409);
    const team = await prisma.team.findFirst({ where: { id: teamId, clubId: current.clubId, active: true } });
    if (!team) throw new ApiInputError("Diese Mannschaft gehört nicht zu deinem Verein.", 404);
    let membership = await prisma.membership.findFirst({ where: { userId: user.id, clubId: current.clubId, teamId, status: "active" } });
    if (!membership) {
      if (!(await requireClubAdmin(user.id))) throw new ApiInputError("Du bist dieser Mannschaft nicht zugeordnet.", 403);
      membership = await prisma.membership.create({ data: { userId: user.id, clubId: current.clubId, teamId, role: "admin", clubAdmin: true } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { activeTeamId: teamId, role: membership.role } });
    return NextResponse.json({ organization: await organizationContext(user.id) });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
