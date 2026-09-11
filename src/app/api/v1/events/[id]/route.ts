import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, objectValue, readJson } from "@/lib/api-security";
import { getEvents } from "@/lib/events";
import { prisma } from "@/lib/db";
import { eventToDatabase } from "@/lib/server-data";
import { validateEvents } from "@/lib/validators";
import { activeClubScope, scopedResourceWhere } from "@/lib/club-context";
import { notifyEventChange } from "@/lib/event-notifications";
import { eventDeletionWhere } from "@/lib/event-series";
import { applicationUrl } from "@/lib/invitations";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine ändern." }, { status: 403 });

  try {
    const { id } = await context.params;
    const body = objectValue(await readJson(request, 256_000), "Ungültige Termindaten.");
    const [event] = validateEvents([{ ...body, id, responses: {} }]);
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    const existing = await prisma.clubEvent.findFirst({ where: { id, ...scopedResourceWhere(scope) } });
    if (!existing) return NextResponse.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    const trainerIds = event.type === "training" ? event.trainerIds ?? [] : [];
    const existingTrainerIds = Array.isArray(existing.trainerIds) ? existing.trainerIds.filter((value): value is string => typeof value === "string") : [];
    if (existing.type === "training" && event.type === "training" && existingTrainerIds.length > 0 && trainerIds.length === 0) return NextResponse.json({ error: "Der einzige verantwortliche Trainer kann nicht entfernt werden. Weise zuerst einen weiteren Trainer zu." }, { status: 409 });
    if (trainerIds.length) {
      const validTrainerCount = await prisma.membership.count({ where: { userId: { in: trainerIds }, clubId: scope.clubId, ...(scope.teamId ? { OR: [{ teamId: scope.teamId }, { teamId: null }] } : {}), status: "active", role: { in: ["trainer", "admin"] } } });
      if (validTrainerCount !== trainerIds.length) return NextResponse.json({ error: "Mindestens eine Trainerzuordnung ist ungültig." }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const presetPlayerIds = !existing.autoSetPlayersPresent && event.autoSetPlayersPresent && event.type !== "event"
        ? (await tx.membership.findMany({ where: { clubId: scope.clubId, ...(scope.teamId ? { teamId: scope.teamId } : {}), status: "active", role: "player" }, select: { userId: true } })).map((membership) => membership.userId)
        : [];
      const maxParticipants = event.maxParticipants === 0 ? 0 : Math.max(event.maxParticipants, presetPlayerIds.length);
      const result = await tx.clubEvent.updateMany({ where: { id, ...scopedResourceWhere(scope) }, data: { ...eventToDatabase({ ...event, trainerIds }), maxParticipants } });
      for (const trainerId of trainerIds) await tx.attendanceResponse.upsert({ where: { eventId_userId: { eventId: id, userId: trainerId } }, update: { value: "yes" }, create: { eventId: id, userId: trainerId, value: "yes" } });
      if (presetPlayerIds.length) await tx.attendanceResponse.createMany({ data: presetPlayerIds.map((userId) => ({ eventId: id, userId, value: "yes" })), skipDuplicates: true });
      return result;
    });
    if (updated.count !== 1) return NextResponse.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    const savedEvent = (await getEvents(user)).find((item) => item.id === id);
    const notificationAction = !existing.cancelledAt && event.cancelledAt ? "cancelled" : existing.cancelledAt && !event.cancelledAt ? "restored" : "updated";
    const notifications = savedEvent ? await notifyEventChange({ event: savedEvent, scope, actor: user, action: notificationAction, appUrl: applicationUrl(request) }).catch(() => ({ email: 0, push: 0 })) : { email: 0, push: 0 };
    return NextResponse.json({ event: savedEvent, notifications });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine löschen." }, { status: 403 });

  try {
    const { id } = await context.params;
    const deleteScope = request.nextUrl.searchParams.get("scope") ?? "single";
    if (deleteScope !== "single" && deleteScope !== "following") throw new ApiInputError("Ungültiger Löschumfang.");
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    const event = (await getEvents(user)).find((item) => item.id === id);
    const deletedIds = await prisma.$transaction(async (tx) => {
      const existing = await tx.clubEvent.findFirst({ where: { id, ...scopedResourceWhere(scope) } });
      if (!existing) throw new ApiInputError("Der Termin wurde nicht gefunden.", 404);
      const where = eventDeletionWhere(existing, deleteScope);
      const matches = await tx.clubEvent.findMany({ where, select: { id: true } });
      await tx.clubEvent.deleteMany({ where });
      return matches.map((item) => item.id);
    }, { isolationLevel: "Serializable" });
    const notifications = event ? await notifyEventChange({ event, scope, actor: user, action: "deleted", appUrl: applicationUrl(request) }).catch(() => ({ email: 0, push: 0 })) : { email: 0, push: 0 };
    return NextResponse.json({ ok: true, deletedIds, notifications });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
