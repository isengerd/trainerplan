import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { ApiInputError, apiError, objectValue, optionalText, readJson, textValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";
import { duplicateTournamentPlayers } from "@/lib/tournament-planning";
import type { ClubSettings, TournamentSquad } from "@/data/club";

function parseSquads(value: unknown, eventId: string): TournamentSquad[] {
  if (!Array.isArray(value) || value.length > 50) throw new ApiInputError("Ungültige Mannschaftsdaten.");
  const squads = value.map((item) => {
    const input = objectValue(item);
    if (!Array.isArray(input.playerIds) || input.playerIds.length > 100) throw new ApiInputError("Die Spielerliste ist ungültig.");
    const playerIds = input.playerIds.map((id) => textValue(id, "Spieler-ID", 100, 1));
    if (new Set(playerIds).size !== playerIds.length) throw new ApiInputError("Ein Spieler ist in einer Mannschaft doppelt enthalten.");
    return {
      id: textValue(input.id, "Mannschafts-ID", 120, 1),
      eventId,
      name: textValue(input.name, "Mannschaftsname", 80, 1),
      trainerId: optionalText(input.trainerId, "Trainer-ID", 100) || null,
      playerIds,
    } satisfies TournamentSquad;
  });
  if (new Set(squads.map((squad) => squad.id)).size !== squads.length) throw new ApiInputError("Mannschaften enthalten doppelte IDs.");
  if (duplicateTournamentPlayers(squads).size) throw new ApiInputError("Ein Spieler darf pro Turnier nur einer Mannschaft zugeordnet sein.", 409);
  return squads;
}

export async function PUT(request: NextRequest) {
  const actor = await authenticatedUser(request);
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(actor.role)) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  try {
    const body = await readJson<{ eventId?: unknown; squads?: unknown }>(request, 500_000);
    const eventId = textValue(body.eventId, "Turnier-ID", 120, 1);
    const squads = parseSquads(body.squads, eventId);
    const [event, config] = await Promise.all([
      prisma.clubEvent.findUnique({ where: { id: eventId }, select: { type: true } }),
      prisma.appConfig.findUniqueOrThrow({ where: { id: "default" }, select: { settings: true } }),
    ]);
    if (!event || event.type !== "tournament") throw new ApiInputError("Das ausgewählte Turnier existiert nicht.", 404);
    const settings = config.settings as unknown as Partial<ClubSettings>;
    const maxTeamSize = settings.tournamentMaxTeamSize ?? 6;
    if (maxTeamSize > 0 && squads.some((squad) => squad.playerIds.length > maxTeamSize)) throw new ApiInputError(`Eine Mannschaft darf höchstens ${maxTeamSize} Spieler enthalten.`);

    const trainerIds = [...new Set(squads.map((squad) => squad.trainerId).filter((id): id is string => Boolean(id)))];
    const playerIds = [...new Set(squads.flatMap((squad) => squad.playerIds))];
    const [validTrainers, validPlayers, existingSquads] = await Promise.all([
      trainerIds.length ? prisma.user.findMany({ where: { id: { in: trainerIds }, role: { in: ["admin", "trainer"] } }, select: { id: true } }) : [],
      playerIds.length ? prisma.user.findMany({ where: { id: { in: playerIds }, role: "player" }, select: { id: true } }) : [],
      prisma.tournamentSquad.findMany({ where: { id: { in: squads.map((squad) => squad.id) } }, select: { id: true, eventId: true } }),
    ]);
    if (validTrainers.length !== trainerIds.length) throw new ApiInputError("Ein ausgewählter Trainer ist ungültig.");
    if (validPlayers.length !== playerIds.length) throw new ApiInputError("Ein ausgewählter Spieler ist ungültig.");
    if (existingSquads.some((squad) => squad.eventId !== eventId)) throw new ApiInputError("Eine Mannschaft gehört bereits zu einem anderen Turnier.", 409);

    await prisma.$transaction(async (tx) => {
      await tx.tournamentSquadPlayer.deleteMany({ where: { eventId } });
      const squadIds = squads.map((squad) => squad.id);
      await tx.tournamentSquad.deleteMany({ where: { eventId, ...(squadIds.length ? { id: { notIn: squadIds } } : {}) } });
      for (const squad of squads) {
        await tx.tournamentSquad.upsert({
          where: { id: squad.id },
          update: { name: squad.name, trainerId: squad.trainerId },
          create: { id: squad.id, eventId, name: squad.name, trainerId: squad.trainerId },
        });
        if (squad.playerIds.length) await tx.tournamentSquadPlayer.createMany({ data: squad.playerIds.map((playerId) => ({ squadId: squad.id, eventId, playerId })) });
      }
    });
    return NextResponse.json({ eventId, squads });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
