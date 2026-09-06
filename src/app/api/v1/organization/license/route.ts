import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizationContext, requireClubAdmin } from "@/lib/organization";
import { ApiInputError, apiError, readJson, textValue } from "@/lib/api-security";
import { effectiveLicenseType } from "@/lib/license";
import type { LicenseType } from "@/data/club";

const types: LicenseType[] = ["single_team_free", "single_team_pro", "club"];

export async function PUT(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const admin = await requireClubAdmin(user.id);
    if (!admin) throw new ApiInputError("Nur der Lizenzinhaber darf den Tarif ändern.", 403);
    const body = await readJson<{ licenseType?: unknown }>(request, 8_192);
    const requested = textValue(body.licenseType, "Tarif", 40, 2) as LicenseType;
    if (!types.includes(requested)) throw new ApiInputError("Unbekannter Tarif.");
    const club = await prisma.club.findUniqueOrThrow({ where: { id: admin.scope.clubId } });
    const current = effectiveLicenseType(club.licenseType, club.licenseExpiresAt);
    const rank = { single_team_free: 0, single_team_pro: 1, club: 2 } as const;
    if (rank[requested] <= rank[current]) throw new ApiInputError("Für einen Downgrade ist eine ausdrückliche Bestätigung erforderlich.");
    await prisma.$transaction([
      prisma.club.update({ where: { id: club.id }, data: { licenseType: requested, licenseExpiresAt: null } }),
      ...(requested === "club" ? [prisma.team.updateMany({ where: { clubId: club.id }, data: { active: true } })] : []),
    ]);
    return NextResponse.json({ organization: await organizationContext(user.id) });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const admin = await requireClubAdmin(user.id);
    if (!admin) throw new ApiInputError("Nur der Lizenzinhaber darf den Tarif ändern.", 403);
    const body = await readJson<{ teamId?: unknown; confirmation?: unknown; licenseType?: unknown }>(request, 8_192);
    const target = textValue(body.licenseType, "Tarif", 40, 2) as LicenseType;
    if (target !== "single_team_free" && target !== "single_team_pro") throw new ApiInputError("Ungültiger Downgrade-Tarif.");
    if (body.confirmation !== "TARIF WECHSELN") throw new ApiInputError("Bitte bestätige den Tarifwechsel mit „TARIF WECHSELN“.");
    const club = await prisma.club.findUniqueOrThrow({ where: { id: admin.scope.clubId } });
    const current = effectiveLicenseType(club.licenseType, club.licenseExpiresAt);
    if (current === "single_team_free" || (current === "single_team_pro" && target !== "single_team_free")) throw new ApiInputError("Dieser Downgrade ist nicht möglich.");
    const teamId = body.teamId ? textValue(body.teamId, "Mannschaft", 120, 1) : admin.scope.teamId;
    const team = teamId ? await prisma.team.findFirst({ where: { id: teamId, clubId: club.id, active: true } }) : null;
    if (!team) throw new ApiInputError("Bitte wähle die Mannschaft, die aktiv bleiben soll.", 404);
    await prisma.$transaction([
      prisma.club.update({ where: { id: club.id }, data: { licenseType: target, licenseExpiresAt: null } }),
      prisma.team.updateMany({ where: { clubId: club.id, id: { not: team.id } }, data: { active: false } }),
      prisma.team.update({ where: { id: team.id }, data: { active: true } }),
      prisma.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } }),
    ]);
    return NextResponse.json({ organization: await organizationContext(user.id) });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
