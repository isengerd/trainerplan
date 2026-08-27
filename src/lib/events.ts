import { Prisma, type User } from "@prisma/client";
import type { ClubEvent, ClubSettings } from "@/data/club";
import { prisma } from "./db";
import { ApiInputError } from "./api-security";
import { berlinDateTime, eventFromDatabase, eventToDatabase, ensureApplicationData } from "./server-data";
import { validateEvents } from "./validators";
import { activeClubScope, ensureClubConfig, scopedResourceWhere } from "./club-context";

export async function getEvents(user: Pick<User, "id" | "role">): Promise<ClubEvent[]> {
  await ensureApplicationData();
  const scope = await activeClubScope(user);
  const scopedConfig = scope ? await ensureClubConfig(scope) : null;
  const [events, config] = await Promise.all([
    prisma.clubEvent.findMany({ where: scope ? { OR: [scopedResourceWhere(scope), { clubId: null }] } : { clubId: null }, include: { responses: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    Promise.resolve(scopedConfig ?? (scope ? null : prisma.appConfig.findUnique({ where: { id: "default" }, select: { settings: true } }))).then((config) => config),
  ]);
  if (!config) throw new ApiInputError("Die Konfiguration konnte nicht geladen werden.");
  const settings = config.settings as unknown as Pick<ClubSettings, "showResponsesToPlayers">;

  return events.map((event) => {
    const mapped = eventFromDatabase(event);
    if (user.role === "player" && settings.showResponsesToPlayers === false) {
      return { ...mapped, responses: mapped.responses[user.id] ? { [user.id]: mapped.responses[user.id] } : {} };
    }
    return mapped;
  });
}

export async function saveEvents(value: unknown, user: User) {
  const events = validateEvents(value);
  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  const scopedConfig = await ensureClubConfig(scope);
  if (!scopedConfig) throw new ApiInputError("Die Konfiguration konnte nicht geladen werden.");

  if (user.role === "player") {
    const settings = scopedConfig.settings as unknown as ClubSettings;
    if (!settings.attendanceEnabled) throw new ApiInputError("Teilnahmerückmeldungen sind deaktiviert.", 403);

    for (const incoming of events) {
      const existing = await prisma.clubEvent.findFirst({ where: { id: incoming.id, OR: [scopedResourceWhere(scope), { clubId: null }] }, include: { responses: true } });
      if (!existing) continue;
      const value = incoming.responses[user.id];
      const deadlineHours = existing.type === "training" ? settings.trainingDeadlineHours : existing.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
      const storedDate = existing.date.toISOString().slice(0, 10);
      if (Date.now() > berlinDateTime(storedDate, existing.startTime).getTime() - deadlineHours * 3600000) throw new ApiInputError("Die Rückmeldefrist ist abgelaufen.", 409);
      if (!value) await prisma.attendanceResponse.deleteMany({ where: { eventId: incoming.id, userId: user.id } });
      else {
        const yesCount = existing.responses.filter((response) => response.value === "yes" && response.userId !== user.id).length;
        const acceptedValue = value === "yes" && yesCount >= existing.maxParticipants ? (settings.waitlistEnabled ? "maybe" : null) : value;
        if (!acceptedValue) throw new ApiInputError("Der Termin ist bereits voll.", 409);
        await prisma.attendanceResponse.upsert({ where: { eventId_userId: { eventId: incoming.id, userId: user.id } }, update: { value: acceptedValue }, create: { eventId: incoming.id, userId: user.id, value: acceptedValue } });
      }
    }
    return { ok: true };
  }

  const responseUserIds = [...new Set(events.flatMap((event) => Object.keys(event.responses)))];
  if (responseUserIds.length && await prisma.membership.count({ where: { userId: { in: responseUserIds }, clubId: scope.clubId, teamId: scope.teamId, status: "active" } }) !== responseUserIds.length) throw new ApiInputError("Eine Teilnahme gehört zu keinem Mitglied dieser Mannschaft.");
  const ids = events.map((event) => event.id);
  await prisma.$transaction(async (tx) => {
    if (ids.length) await tx.clubEvent.deleteMany({ where: { ...scopedResourceWhere(scope), id: { notIn: ids } } });
    else await tx.clubEvent.deleteMany({ where: scopedResourceWhere(scope) });
    for (const event of events) {
      await tx.clubEvent.upsert({ where: { id: event.id }, update: { ...eventToDatabase(event), ...scopedResourceWhere(scope) }, create: { id: event.id, ...eventToDatabase(event), ...scopedResourceWhere(scope) } });
      await tx.attendanceResponse.deleteMany({ where: { eventId: event.id } });
      const responses = Object.entries(event.responses);
      if (responses.length) await tx.attendanceResponse.createMany({ data: responses.map(([userId, response]) => ({ eventId: event.id, userId, value: response })) });
    }
  });
  return { ok: true };
}
