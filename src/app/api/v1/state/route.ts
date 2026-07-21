import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { berlinDateTime, eventToDatabase } from "@/lib/server-data";
import type { ClubEvent, ClubSettings, ClubUser } from "@/data/club";
import type { Exercise } from "@/data/demo";

type Resource = "users" | "events" | "exercises" | "settings" | "plans" | "templates";
const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const body = await request.json().catch(() => null) as { resource?: Resource; data?: unknown } | null;
  if (!body?.resource) return NextResponse.json({ error: "Ressource fehlt." }, { status: 400 });

  if (body.resource === "users") {
    const users = body.data as ClubUser[];
    if (!Array.isArray(users)) return NextResponse.json({ error: "Ungültige Benutzerdaten." }, { status: 400 });
    const allowed = user.role === "admin" ? users : users.filter((entry) => entry.id === user.id);
    for (const entry of allowed) {
      await prisma.user.update({
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
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.resource === "events") {
    const events = body.data as ClubEvent[];
    if (!Array.isArray(events)) return NextResponse.json({ error: "Ungültige Termindaten." }, { status: 400 });
    if (!canManage(user.role)) {
      const settings = (await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" } })).settings as unknown as ClubSettings;
      for (const incoming of events) {
        const existing = await prisma.clubEvent.findUnique({ where: { id: incoming.id }, include: { responses: true } });
        if (!existing) continue;
        const value = incoming.responses[user.id];
        const deadlineHours = incoming.type === "training" ? settings.trainingDeadlineHours : incoming.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
        if (Date.now() > berlinDateTime(incoming.date, incoming.startTime).getTime() - deadlineHours * 3600000) return NextResponse.json({ error: "Die Rückmeldefrist ist abgelaufen." }, { status: 409 });
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
    const exercises = body.data as Exercise[];
    if (!Array.isArray(exercises)) return NextResponse.json({ error: "Ungültige Übungsdaten." }, { status: 400 });
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
    await prisma.appConfig.update({ where: { id: "default" }, data: { settings: json(body.data) } });
    return NextResponse.json({ ok: true });
  }

  if (body.resource === "plans") {
    const data = body.data as { plans: unknown; planMeta: unknown };
    await prisma.appConfig.update({ where: { id: "default" }, data: { plans: json(data.plans), planMeta: json(data.planMeta) } });
    return NextResponse.json({ ok: true });
  }

  await prisma.appConfig.update({ where: { id: "default" }, data: { templates: json(body.data) } });
  return NextResponse.json({ ok: true });
}
