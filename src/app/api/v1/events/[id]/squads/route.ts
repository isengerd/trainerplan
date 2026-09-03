import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { getTournamentSquads, saveTournamentSquads } from "@/lib/tournament-squads";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await context.params;
  const managedPlayerIds = (user.role === "player" || user.role === "guardian")
    ? (await prisma.guardianPlayer.findMany({ where: { guardianId: user.id }, select: { playerId: true } })).map((link) => link.playerId)
    : [];
  const visiblePlayerIds = user.role === "guardian" ? managedPlayerIds : user.role === "player" ? [user.id, ...managedPlayerIds] : undefined;
  return NextResponse.json({ eventId: id, squads: await getTournamentSquads(id, visiblePlayerIds) });
}

export async function PUT(request: NextRequest, context: Context) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Mannschaften planen." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await readJson<{ squads?: unknown }>(request, 500_000);
    return NextResponse.json(await saveTournamentSquads(id, body.squads));
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
