import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { getTournamentSquads, saveTournamentSquads } from "@/lib/tournament-squads";
import { activeClubScope, scopedResourceWhere } from "@/lib/club-context";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await context.params;
  const scope = await activeClubScope(user);
  const event = scope ? await prisma.clubEvent.findFirst({ where: { id, ...scopedResourceWhere(scope) }, select: { id: true, tournamentPlanPublishedAt: true } }) : null;
  if (!event) return NextResponse.json({ error: "Das Turnier wurde nicht gefunden." }, { status: 404 });
  if (!canManage(user.role) && !event.tournamentPlanPublishedAt) return NextResponse.json({ error: "Die Mannschaftsplanung wurde noch nicht freigegeben." }, { status: 403 });
  const managedPlayerIds = (user.role === "player" || user.role === "guardian")
    ? (await prisma.guardianPlayer.findMany({ where: { guardianId: user.id }, select: { playerId: true } })).map((link) => link.playerId)
    : [];
  const visiblePlayerIds = user.role === "guardian" ? managedPlayerIds : user.role === "player" ? [user.id, ...managedPlayerIds] : undefined;
  return NextResponse.json({ eventId: id, squads: await getTournamentSquads(id, visiblePlayerIds) });
}

export async function PATCH(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Mannschaftsplanungen freigeben." }, { status: 403 });
  try {
    const { id } = await context.params;
    const scope = await activeClubScope(user);
    const event = scope ? await prisma.clubEvent.findFirst({ where: { id, type: "tournament", ...scopedResourceWhere(scope) }, select: { id: true } }) : null;
    if (!event) return NextResponse.json({ error: "Das Turnier wurde nicht gefunden." }, { status: 404 });
    const body = await readJson<{ published?: unknown }>(request, 2_000);
    if (typeof body.published !== "boolean") return NextResponse.json({ error: "Der Freigabestatus ist ungültig." }, { status: 400 });
    if (body.published && !await prisma.tournamentSquadPlayer.count({ where: { eventId: id } })) return NextResponse.json({ error: "Eine leere Mannschaftsplanung kann nicht freigegeben werden." }, { status: 409 });
    const tournamentPlanPublishedAt = body.published ? new Date() : null;
    await prisma.clubEvent.update({ where: { id }, data: { tournamentPlanPublishedAt } });
    return NextResponse.json({ eventId: id, publishedAt: tournamentPlanPublishedAt?.toISOString() ?? null });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Mannschaften planen." }, { status: 403 });
  try {
    const { id } = await context.params;
    const scope = await activeClubScope(user);
    if (!scope || !await prisma.clubEvent.findFirst({ where: { id, type: "tournament", ...scopedResourceWhere(scope) }, select: { id: true } })) return NextResponse.json({ error: "Das Turnier wurde nicht gefunden." }, { status: 404 });
    const body = await readJson<{ squads?: unknown }>(request, 500_000);
    return NextResponse.json(await saveTournamentSquads(id, body.squads, scope));
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
