import type { ClubSettings, TournamentSquad } from "@/data/club";
import { prisma } from "./db";
import { ApiInputError, objectValue, optionalText, textValue } from "./api-security";
import { duplicateTournamentPlayers } from "./tournament-planning";
import type { ClubScope } from "./club-context";
import { ensureClubConfig, scopedResourceWhere } from "./club-context";

function parseSquads(value: unknown, eventId: string): TournamentSquad[] {
  if (!Array.isArray(value) || value.length > 50) throw new ApiInputError("Ungültige Mannschaftsdaten.");
  const squads = value.map((item) => {
    const input = objectValue(item);
    if (!Array.isArray(input.playerIds) || input.playerIds.length > 100) throw new ApiInputError("Die Spielerliste ist ungültig.");
    const playerIds = input.playerIds.map((id) => textValue(id, "Spieler-ID", 100, 1));
    if (new Set(playerIds).size !== playerIds.length) throw new ApiInputError("Ein Spieler ist in einer Mannschaft doppelt enthalten.");
    return {
      id: textValue(input.id, "Mannschafts-ID", 120, 1), eventId,
      name: textValue(input.name, "Mannschaftsname", 80, 1),
      trainerId: optionalText(input.trainerId, "Trainer-ID", 100) || null, playerIds,
    } satisfies TournamentSquad;
  });
  if (new Set(squads.map((squad) => squad.id)).size !== squads.length) throw new ApiInputError("Mannschaften enthalten doppelte IDs.");
  if (duplicateTournamentPlayers(squads).size) throw new ApiInputError("Ein Spieler darf pro Turnier nur einer Mannschaft zugeordnet sein.", 409);
  return squads;
}

export async function saveTournamentSquads(eventId: string, value: unknown, scope: ClubScope) {
  const squads = parseSquads(value, eventId);
  const [event, config] = await Promise.all([
    prisma.clubEvent.findFirst({ where: { id: eventId, ...scopedResourceWhere(scope) }, select: { type: true } }),
    ensureClubConfig(scope),
  ]);
  if (!event || event.type !== "tournament") throw new ApiInputError("Das ausgewählte Turnier existiert nicht.", 404);
  if (!config) throw new ApiInputError("Die Mannschaftskonfiguration fehlt.", 404);
  const settings = config.settings as unknown as Partial<ClubSettings>;
  const maxTeamSize = settings.tournamentMaxTeamSize ?? 6;
  if (maxTeamSize > 0 && squads.some((squad) => squad.playerIds.length > maxTeamSize)) throw new ApiInputError(`Eine Mannschaft darf höchstens ${maxTeamSize} Spieler enthalten.`);

  const trainerIds = [...new Set(squads.map((squad) => squad.trainerId).filter((id): id is string => Boolean(id)))];
  const playerIds = [...new Set(squads.flatMap((squad) => squad.playerIds))];
  const [validTrainers, validPlayers, existingSquads] = await Promise.all([
    trainerIds.length ? prisma.membership.findMany({ where: { userId: { in: trainerIds }, clubId: scope.clubId, teamId: scope.teamId, status: "active", role: { in: ["admin", "trainer"] } }, select: { userId: true } }) : [],
    playerIds.length ? prisma.membership.findMany({ where: { userId: { in: playerIds }, clubId: scope.clubId, teamId: scope.teamId, status: "active", role: "player" }, select: { userId: true } }) : [],
    prisma.tournamentSquad.findMany({ where: { id: { in: squads.map((squad) => squad.id) } }, select: { id: true, eventId: true } }),
  ]);
  if (validTrainers.length !== trainerIds.length) throw new ApiInputError("Ein ausgewählter Trainer ist ungültig.");
  if (validPlayers.length !== playerIds.length) throw new ApiInputError("Ein ausgewählter Spieler ist ungültig.");
  if (existingSquads.some((squad) => squad.eventId !== eventId)) throw new ApiInputError("Eine Mannschaft gehört bereits zu einem anderen Turnier.", 409);

  await prisma.$transaction(async (tx) => {
    await tx.clubEvent.update({ where: { id: eventId }, data: { tournamentPlanPublishedAt: null } });
    await tx.tournamentSquadPlayer.deleteMany({ where: { eventId } });
    const squadIds = squads.map((squad) => squad.id);
    await tx.tournamentSquad.deleteMany({ where: { eventId, ...(squadIds.length ? { id: { notIn: squadIds } } : {}) } });
    for (const squad of squads) {
      await tx.tournamentSquad.upsert({ where: { id: squad.id }, update: { name: squad.name, trainerId: squad.trainerId }, create: { id: squad.id, eventId, name: squad.name, trainerId: squad.trainerId } });
      if (squad.playerIds.length) await tx.tournamentSquadPlayer.createMany({ data: squad.playerIds.map((playerId) => ({ squadId: squad.id, eventId, playerId })) });
    }
  });
  return { eventId, squads };
}

export async function getTournamentSquads(eventId: string, visiblePlayerIds?: string[]) {
  const squads = await prisma.tournamentSquad.findMany({ where: { eventId }, include: { players: { select: { playerId: true } } }, orderBy: { createdAt: "asc" } });
  return squads
    .filter((squad) => !visiblePlayerIds || squad.players.some((player) => visiblePlayerIds.includes(player.playerId)))
    .map((squad) => ({ id: squad.id, eventId, name: squad.name, trainerId: squad.trainerId, playerIds: squad.players.map((player) => player.playerId) }));
}
