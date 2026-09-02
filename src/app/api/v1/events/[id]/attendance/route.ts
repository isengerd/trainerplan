import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { ApiInputError, apiError, readJson } from "@/lib/api-security";
import { getEvents } from "@/lib/events";
import { prisma } from "@/lib/db";
import { berlinDateTime } from "@/lib/server-data";
import type { ClubSettings } from "@/data/club";
import { activeClubScope, ensureClubConfig, scopedResourceWhere } from "@/lib/club-context";

type Context = { params: Promise<{ id: string }> };
type AttendanceBody = { value?: "yes" | "no" | "maybe" | null };

export async function PUT(request: NextRequest, context: Context) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  try {
    const { id } = await context.params;
    const body = await readJson<AttendanceBody>(request, 8_192);
    if (body.value !== undefined && body.value !== null && !["yes", "no", "maybe"].includes(body.value)) throw new ApiInputError("Die Teilnahme ist ungültig.");
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    const scopedConfig = await ensureClubConfig(scope);
    if (!scopedConfig) return NextResponse.json({ error: "Die Konfiguration konnte nicht geladen werden." }, { status: 500 });
    const [event, config] = await Promise.all([
      prisma.clubEvent.findFirst({ where: { id, ...scopedResourceWhere(scope) }, include: { responses: true } }),
      Promise.resolve(scopedConfig),
    ]);
    if (!event) return NextResponse.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    const settings = config.settings as unknown as ClubSettings;
    if (!settings.attendanceEnabled) throw new ApiInputError("Teilnahmerückmeldungen sind deaktiviert.", 403);
    const storedDate = event.date.toISOString().slice(0, 10);
    const deadlineHours = event.type === "training" ? settings.trainingDeadlineHours : event.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
    if (Date.now() > berlinDateTime(storedDate, event.startTime).getTime() - deadlineHours * 3600000) throw new ApiInputError("Die Rückmeldefrist ist abgelaufen.", 409);

    const trainerIds = Array.isArray(event.trainerIds) ? event.trainerIds.filter((value): value is string => typeof value === "string") : [];
    if (user.role !== "player" && event.type === "training") {
      const isResponsible = trainerIds.includes(user.id);
      if (body.value !== "yes" && isResponsible && trainerIds.length === 1) throw new ApiInputError("Der einzige verantwortliche Trainer kann nicht absagen. Weise zuerst einen weiteren Trainer zu.", 409);
      const nextTrainerIds = body.value === "yes" ? [...new Set([...trainerIds, user.id])] : trainerIds.filter((id) => id !== user.id);
      await prisma.$transaction(async (tx) => {
        await tx.clubEvent.update({ where: { id }, data: { trainerIds: nextTrainerIds } });
        if (!body.value) await tx.attendanceResponse.deleteMany({ where: { eventId: id, userId: user.id } });
        else await tx.attendanceResponse.upsert({ where: { eventId_userId: { eventId: id, userId: user.id } }, update: { value: body.value }, create: { eventId: id, userId: user.id, value: body.value } });
      });
    } else if (!body.value) {
      await prisma.attendanceResponse.deleteMany({ where: { eventId: id, userId: user.id } });
    } else {
      const yesCount = await prisma.attendanceResponse.count({ where: { eventId: id, value: "yes", userId: { not: user.id }, user: { role: "player" } } });
      const acceptedValue = body.value === "yes" && yesCount >= event.maxParticipants ? (settings.waitlistEnabled ? "maybe" : null) : body.value;
      if (!acceptedValue) throw new ApiInputError("Der Termin ist bereits voll.", 409);
      await prisma.attendanceResponse.upsert({ where: { eventId_userId: { eventId: id, userId: user.id } }, update: { value: acceptedValue }, create: { eventId: id, userId: user.id, value: acceptedValue } });
    }

    return NextResponse.json({ event: (await getEvents(user)).find((item) => item.id === id) });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
