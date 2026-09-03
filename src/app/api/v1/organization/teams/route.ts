import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, readJson, textValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { isFirstTeamAgeGroup } from "@/lib/age-groups";
import { organizationContext, requireClubAdmin } from "@/lib/organization";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const admin = await requireClubAdmin(user.id);
    if (!admin) throw new ApiInputError("Nur Vereinsadmins dürfen Mannschaften anlegen.", 403);
    const club = await prisma.club.findUniqueOrThrow({ where: { id: admin.scope.clubId } });
    if (club.licenseType !== "club") throw new ApiInputError("Weitere Mannschaften benötigen den Vereinsmodus.", 403);
    const body = await readJson<{ name?: unknown; ageGroup?: unknown }>(request, 8_192);
    const name = textValue(body.name, "Mannschaftsname", 120, 2);
    const ageGroup = textValue(body.ageGroup, "Altersklasse", 2, 2).toLowerCase();
    if (!isFirstTeamAgeGroup(ageGroup)) throw new ApiInputError("Bitte wähle eine gültige Altersklasse.");
    const team = await prisma.team.create({ data: { clubId: club.id, name, ageGroup } });
    await prisma.membership.create({ data: { userId: user.id, clubId: club.id, teamId: team.id, role: "admin", clubAdmin: true } });
    const sourceConfig = await prisma.appConfig.findUnique({ where: { id: `club-${club.id}` } }) ?? await prisma.appConfig.findUnique({ where: { id: "default" } });
    if (sourceConfig) {
      const sourceSettings = sourceConfig.settings as Record<string, unknown>;
      await prisma.appConfig.create({ data: { id: `team-${team.id}`, clubId: club.id, teamId: team.id, settings: { ...sourceSettings, clubName: club.name, teamName: name } as Prisma.InputJsonValue, plans: {}, templates: sourceConfig.templates as Prisma.InputJsonValue, planMeta: {} } });
    }
    return NextResponse.json({ team, organization: await organizationContext(user.id) }, { status: 201 });
  } catch (error) {
    const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
