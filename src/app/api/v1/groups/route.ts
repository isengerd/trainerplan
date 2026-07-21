import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type GroupInput = { id?: string; name?: string; description?: string; color?: string };

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Gruppen verwalten." }, { status: user ? 403 : 401 });
  const body = await request.json().catch(() => null) as { groups?: GroupInput[] } | null;
  if (!Array.isArray(body?.groups)) return NextResponse.json({ error: "Ungültige Gruppendaten." }, { status: 400 });

  const groups = body.groups.filter((group) => group.name?.trim()).map((group) => ({
    id: group.id || `group-${crypto.randomUUID()}`,
    name: group.name!.trim().slice(0, 80),
    description: group.description?.trim().slice(0, 240) || "",
    color: /^#[0-9a-f]{6}$/i.test(group.color || "") ? group.color! : "#45d875",
  }));
  await prisma.$transaction(async (tx) => {
    for (const group of groups) await tx.teamGroup.upsert({ where: { id: group.id }, update: group, create: group });
    const ids = groups.map((group) => group.id);
    if (ids.length) await tx.teamGroup.deleteMany({ where: { id: { notIn: ids }, users: { none: {} }, invitations: { none: {} } } });
  });
  return NextResponse.json({ groups: await prisma.teamGroup.findMany({ orderBy: { name: "asc" } }) });
}
