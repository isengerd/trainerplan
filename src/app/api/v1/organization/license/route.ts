import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizationContext, requireClubAdmin } from "@/lib/organization";
import { ApiInputError, apiError, readJson, textValue } from "@/lib/api-security";

export async function PUT(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const admin = await requireClubAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Nur Vereinsadmins dürfen den Vereinsmodus aktivieren." }, { status: 403 });
  await prisma.$transaction([
    prisma.club.update({ where: { id: admin.scope.clubId }, data: { licenseType: "club" } }),
    prisma.team.updateMany({ where: { clubId: admin.scope.clubId }, data: { active: true } }),
  ]);
  return NextResponse.json({ organization: await organizationContext(user.id) });
}

export async function DELETE(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const admin = await requireClubAdmin(user.id);
    if (!admin) throw new ApiInputError("Nur der Lizenzinhaber darf den Tarif ändern.", 403);
    const body = await readJson<{ teamId?: unknown; confirmation?: unknown }>(request, 8_192);
    const teamId = textValue(body.teamId, "Mannschaft", 120, 1);
    if (body.confirmation !== "EINZELMANNSCHAFT") throw new ApiInputError("Bitte bestätige den Tarifwechsel.");
    const team = await prisma.team.findFirst({ where: { id: teamId, clubId: admin.scope.clubId, active: true } });
    if (!team) throw new ApiInputError("Die ausgewählte Mannschaft existiert nicht.", 404);
    await prisma.$transaction([
      prisma.club.update({ where: { id: admin.scope.clubId }, data: { licenseType: "single_team" } }),
      prisma.team.updateMany({ where: { clubId: admin.scope.clubId, id: { not: team.id } }, data: { active: false } }),
      prisma.team.update({ where: { id: team.id }, data: { active: true } }),
      prisma.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } }),
    ]);
    return NextResponse.json({ organization: await organizationContext(user.id) });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
