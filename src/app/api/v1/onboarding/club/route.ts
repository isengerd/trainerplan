import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";
import { ApiInputError, readJson, textValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { uniqueClubSlug } from "@/lib/registration";
import { isFirstTeamAgeGroup } from "@/lib/age-groups";

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (await prisma.membership.findFirst({ where: { userId: user.id, status: "active" }, select: { id: true } })) return NextResponse.json({ error: "Dein Verein ist bereits eingerichtet." }, { status: 409 });
  try {
    const body = await readJson<{ name?: unknown; clubName?: unknown; designation?: unknown; ageGroup?: unknown }>(request, 16_384);
    const name = textValue(body.name, "Name", 100, 2);
    const clubName = textValue(body.clubName, "Vereinsname", 120, 2);
    const ageGroup = textValue(body.ageGroup, "Altersklasse", 2, 2).toLowerCase();
    if (!isFirstTeamAgeGroup(ageGroup)) throw new ApiInputError("Bitte wähle eine gültige Altersklasse von G2 bis A1.", 400);
    const ageGroupRecord = await prisma.ageGroup.findUnique({ where: { id: ageGroup }, select: { name: true } });
    if (!ageGroupRecord) throw new ApiInputError("Die ausgewählte Altersklasse ist nicht verfügbar.", 400);
    const designation = typeof body.designation === "string" && body.designation.trim()
      ? textValue(body.designation, "Zusatzbezeichnung", 80, 1)
      : "";
    const teamName = designation ? `${ageGroupRecord.name} · ${designation}` : ageGroupRecord.name;
    const result = await prisma.$transaction(async (tx) => {
      let club;
      for (let suffix = 0; suffix < 100; suffix += 1) {
        try { club = await tx.club.create({ data: { name: clubName, slug: uniqueClubSlug(clubName, suffix) } }); break; }
        catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error; }
      }
      if (!club) throw new ApiInputError("Der Verein konnte nicht angelegt werden.", 409);
      // Store the stable catalog ID, not the display label, so the team can advance next season.
      const team = await tx.team.create({ data: { clubId: club.id, name: teamName, ageGroup } });
      const updatedUser = await tx.user.update({ where: { id: user.id }, data: { name, ageGroup } });
      await tx.membership.create({ data: { userId: user.id, clubId: club.id, teamId: team.id, role: "admin" } });
      const config = await tx.appConfig.findUnique({ where: { id: "default" } });
      if (config) {
        const settings = { ...(config.settings as Record<string, unknown>), clubName, teamName };
        await tx.appConfig.upsert({
          where: { id: `club-${club.id}` },
          create: { id: `club-${club.id}`, clubId: club.id, teamId: team.id, settings, plans: config.plans as Prisma.InputJsonValue, templates: config.templates as Prisma.InputJsonValue, planMeta: config.planMeta as Prisma.InputJsonValue },
          update: { teamId: team.id, settings, plans: config.plans as Prisma.InputJsonValue, templates: config.templates as Prisma.InputJsonValue, planMeta: config.planMeta as Prisma.InputJsonValue },
        });
      }
      return updatedUser;
    });
    return NextResponse.json({ user: safeUser(result), setupRequired: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Einrichtung konnte nicht gespeichert werden.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
}
