import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { berlinDateTime, eventToDatabase } from "@/lib/server-data";
import type { ClubEvent, ClubSettings, ClubUser } from "@/data/club";
import type { Exercise } from "@/data/demo";
import { apiError, readJson } from "@/lib/api-security";
import { validateEvents, validateExercises, validatePlans, validateSettings, validateTemplates, validateUsers } from "@/lib/validators";

type Resource = "users" | "events" | "exercises" | "settings" | "plans" | "templates";
const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  let body: { resource?: Resource; data?: unknown } | null;
  try { body = await readJson(request, 12_000_000); }
  catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
  if (!body?.resource) return NextResponse.json({ error: "Ressource fehlt." }, { status: 400 });

  if (body.resource === "users") {
    let allowed: ClubUser[];
    try { allowed = validateUsers(body.data, user.id, user.role === "admin"); }
    catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
    const existingUsers = await prisma.user.findMany({ select: { id: true, role: true } });
    const existingIds = new Set(existingUsers.map((entry) => entry.id));
    if (allowed.some((entry) => !existingIds.has(entry.id))) return NextResponse.json({ error: "Ein Benutzerkonto existiert nicht." }, { status: 400 });
    if (user.role === "admin") {
      const changedRoles = new Map(allowed.map((entry) => [entry.id, entry.role]));
      if (!existingUsers.some((entry) => (changedRoles.get(entry.id) ?? entry.role) === "admin")) return NextResponse.json({ error: "Mindestens ein Admin muss erhalten bleiben." }, { status: 400 });
      const groupIds = [...new Set(allowed.map((entry) => entry.groupId).filter((id): id is string => Boolean(id)))];
      if (groupIds.length && await prisma.teamGroup.count({ where: { id: { in: groupIds } } }) !== groupIds.length) return NextResponse.json({ error: "Eine ausgewählte Gruppe existiert nicht." }, { status: 400 });
    }
    await prisma.$transaction(allowed.map((entry) => prisma.user.update({
        where: { id: entry.id },
        data: {
          name: entry.name,
          email: entry.email.trim().toLowerCase(),
          role: user.role === "admin" ? entry.role : undefined,
          position: entry.position,
          number: entry.number,
          phone: entry.phone,
          birthday: entry.birthday ? new Date(`${entry.birthday}T12:00:00Z`) : null,
          avatar: entry.avatar,
          groupId: user.role === "admin" ? entry.groupId || null : undefined,
        },
      })));
    return NextResponse.json({ ok: true });
  }

  if (body.resource === "events") {
    let events: ClubEvent[];
    try { events = validateEvents(body.data); }
    catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
    if (!canManage(user.role)) {
      const settings = (await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" } })).settings as unknown as ClubSettings;
      if (!settings.attendanceEnabled) return NextResponse.json({ error: "Teilnahmerückmeldungen sind deaktiviert." }, { status: 403 });
      for (const incoming of events) {
        const existing = await prisma.clubEvent.findUnique({ where: { id: incoming.id }, include: { responses: true } });
        if (!existing) continue;
        const value = incoming.responses[user.id];
        const deadlineHours = existing.type === "training" ? settings.trainingDeadlineHours : existing.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
        const storedDate = existing.date.toISOString().slice(0, 10);
        if (Date.now() > berlinDateTime(storedDate, existing.startTime).getTime() - deadlineHours * 3600000) return NextResponse.json({ error: "Die Rückmeldefrist ist abgelaufen." }, { status: 409 });
        if (!value) await prisma.attendanceResponse.deleteMany({ where: { eventId: incoming.id, userId: user.id } });
        else {
          const yesCount = existing.responses.filter((response) => response.value === "yes" && response.userId !== user.id).length;
          const acceptedValue = value === "yes" && yesCount >= existing.maxParticipants ? (settings.waitlistEnabled ? "maybe" : null) : value;
          if (!acceptedValue) return NextResponse.json({ error: "Der Termin ist bereits voll." }, { status: 409 });
          await prisma.attendanceResponse.upsert({ where: { eventId_userId: { eventId: incoming.id, userId: user.id } }, update: { value: acceptedValue }, create: { eventId: incoming.id, userId: user.id, value: acceptedValue } });
        }
      }
      return NextResponse.json({ ok: true });
    }

    const responseUserIds = [...new Set(events.flatMap((event) => Object.keys(event.responses)))];
    if (responseUserIds.length && await prisma.user.count({ where: { id: { in: responseUserIds } } }) !== responseUserIds.length) return NextResponse.json({ error: "Eine Teilnahme gehört zu keinem vorhandenen Benutzer." }, { status: 400 });
    const ids = events.map((event) => event.id);
    await prisma.$transaction(async (tx) => {
      if (ids.length) await tx.clubEvent.deleteMany({ where: { id: { notIn: ids } } });
      else await tx.clubEvent.deleteMany();
      for (const event of events) {
        await tx.clubEvent.upsert({ where: { id: event.id }, update: eventToDatabase(event), create: { id: event.id, ...eventToDatabase(event) } });
        await tx.attendanceResponse.deleteMany({ where: { eventId: event.id } });
        const responses = Object.entries(event.responses);
        if (responses.length) await tx.attendanceResponse.createMany({ data: responses.map(([userId, value]) => ({ eventId: event.id, userId, value })) });
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (!canManage(user.role)) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  if (body.resource === "exercises") {
    let exercises: Exercise[];
    try { exercises = validateExercises(body.data); }
    catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
    await prisma.$transaction(async (tx) => {
      const ids = exercises.map((exercise) => exercise.id);
      if (ids.length) await tx.exerciseRecord.deleteMany({ where: { id: { notIn: ids } } });
      else await tx.exerciseRecord.deleteMany();
      for (const exercise of exercises) await tx.exerciseRecord.upsert({ where: { id: exercise.id }, update: { data: json(exercise) }, create: { id: exercise.id, data: json(exercise) } });
    });
    return NextResponse.json({ ok: true });
  }

  if (body.resource === "settings") {
    if (user.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Einstellungen ändern." }, { status: 403 });
    let settings: ClubSettings;
    try { settings = validateSettings(body.data); }
    catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
    await prisma.appConfig.update({ where: { id: "default" }, data: { settings: json(settings) } });
    return NextResponse.json({ ok: true });
  }

  if (body.resource === "plans") {
    let data: { plans: Record<string, unknown>; planMeta: Record<string, unknown> };
    try { data = validatePlans(body.data); }
    catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
    await prisma.appConfig.update({ where: { id: "default" }, data: { plans: json(data.plans), planMeta: json(data.planMeta) } });
    return NextResponse.json({ ok: true });
  }

  let templates: unknown[];
  try { templates = validateTemplates(body.data); }
  catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
  await prisma.appConfig.update({ where: { id: "default" }, data: { templates: json(templates) } });
  return NextResponse.json({ ok: true });
}
