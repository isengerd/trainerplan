import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, objectValue, readJson } from "@/lib/api-security";
import { getEvents, saveEvents } from "@/lib/events";
import { eventToDatabase } from "@/lib/server-data";
import { prisma } from "@/lib/db";
import { validateEvents } from "@/lib/validators";
import { activeClubScope, scopedResourceWhere } from "@/lib/club-context";
import { notifyEventChange } from "@/lib/event-notifications";
import { applicationUrl } from "@/lib/invitations";
import { expandEventOccurrences } from "@/lib/event-series";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ events: await getEvents(user) });
}

export async function POST(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine erstellen." }, { status: 403 });

  try {
    const body = objectValue(await readJson(request, 256_000), "Ungültige Termindaten.");
    const [event] = validateEvents([{ ...body, id: `event-${randomUUID()}`, responses: {} }]);
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    const trainerIds = event.type === "training" ? event.trainerIds ?? [] : [];
    if (trainerIds.length) {
      const validTrainerCount = await prisma.membership.count({ where: { userId: { in: trainerIds }, clubId: scope.clubId, ...(scope.teamId ? { OR: [{ teamId: scope.teamId }, { teamId: null }] } : {}), status: "active", role: { in: ["trainer", "admin"] } } });
      if (validTrainerCount !== trainerIds.length) return NextResponse.json({ error: "Mindestens eine Trainerzuordnung ist ungültig." }, { status: 400 });
    }
    const eligiblePlayers = event.type === "event" ? [] : await prisma.membership.findMany({
      where: { clubId: scope.clubId, ...(scope.teamId ? { teamId: scope.teamId } : {}), status: "active", role: "player" },
      select: { userId: true, user: { select: { defaultTrainingAttendance: true, defaultCompetitionAttendance: true } } },
    });
    const presetPlayerIds = eligiblePlayers.filter((membership) => event.autoSetPlayersPresent
      || (event.type === "training" ? membership.user.defaultTrainingAttendance : membership.user.defaultCompetitionAttendance)).map((membership) => membership.userId);
    const initialResponses = [...new Set([...trainerIds, ...presetPlayerIds])];
    const occurrences = expandEventOccurrences({ ...event, trainerIds });
    await prisma.$transaction(occurrences.map((occurrence) => prisma.clubEvent.create({ data: { id: occurrence.id, seriesId: occurrence.seriesId, ...eventToDatabase(occurrence), maxParticipants: occurrence.maxParticipants === 0 ? 0 : Math.max(occurrence.maxParticipants, presetPlayerIds.length), ...scopedResourceWhere(scope), responses: { create: initialResponses.map((userId) => ({ userId, value: "yes" })) } } })));
    const savedEvent = (await getEvents(user)).find((item) => item.id === event.id);
    const notifications = savedEvent ? await notifyEventChange({ event: savedEvent, scope, actor: user, action: "created", appUrl: applicationUrl(request) }).catch(() => ({ email: 0, push: 0 })) : { email: 0, push: 0 };
    return NextResponse.json({ event: savedEvent, notifications }, { status: 201 });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PUT(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role) && user.role !== "player") return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  try {
    const body = await readJson<{ events?: unknown }>(request, 4_000_000);
    if (!Array.isArray(body.events)) throw new Error("Termine fehlen.");
    return NextResponse.json(await saveEvents(body.events, user));
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
