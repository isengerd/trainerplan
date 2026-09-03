import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiInputError, objectValue, optionalText, readJson, textValue } from "@/lib/api-security";
import { activeClubScope } from "@/lib/club-context";

type GroupInput = { id?: string; name?: string; description?: string; color?: string };

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Gruppen verwalten." }, { status: user ? 403 : 401 });
  let body: { groups?: GroupInput[] } | null;
  try { body = await readJson(request, 256_000); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, { status: error instanceof ApiInputError ? error.status : 400 }); }
  if (!Array.isArray(body?.groups) || body.groups.length > 100) return NextResponse.json({ error: "Ungültige Gruppendaten." }, { status: 400 });
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Kein Verein eingerichtet." }, { status: 409 });
  let groups: Array<{ id: string; name: string; description: string; color: string }>;
  try {
    groups = body.groups.map((value) => {
      const group = objectValue(value, "Ungültige Gruppendaten.");
      const color = optionalText(group.color, "Farbe", 7) || "#45d875";
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new ApiInputError("Die Gruppenfarbe ist ungültig.");
      return {
        id: group.id ? textValue(group.id, "Gruppen-ID", 100, 1) : `group-${crypto.randomUUID()}`,
        name: textValue(group.name, "Gruppenname", 80, 1),
        description: optionalText(group.description, "Beschreibung", 240),
        color,
      };
    });
    if (new Set(groups.map((group) => group.id)).size !== groups.length) throw new ApiInputError("Gruppen enthalten doppelte IDs.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ungültige Gruppendaten." }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const existing = await tx.teamGroup.findFirst({ where: { id: group.id, clubId: scope.clubId }, select: { id: true } });
      if (existing) await tx.teamGroup.update({ where: { id: existing.id }, data: { ...group, clubId: scope.clubId } });
      else await tx.teamGroup.create({ data: { ...group, clubId: scope.clubId } });
    }
    const ids = groups.map((group) => group.id);
    await tx.teamGroup.deleteMany({ where: { clubId: scope.clubId, ...(ids.length ? { id: { notIn: ids } } : {}), users: { none: {} }, memberships: { none: {} }, invitations: { none: {} } } });
  });
  return NextResponse.json({ groups: await prisma.teamGroup.findMany({ where: { clubId: scope.clubId }, orderBy: { name: "asc" } }) });
}
