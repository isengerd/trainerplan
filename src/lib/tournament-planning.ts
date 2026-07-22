import type { TournamentSquad } from "@/data/club";

export type SquadValidation = {
  fYouthCount: number;
  minimumMet: boolean;
  sizeExceeded: boolean;
  trainerMissing: boolean;
};

export function duplicateTournamentPlayers(squads: TournamentSquad[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const squad of squads) {
    for (const playerId of squad.playerIds) {
      if (seen.has(playerId)) duplicates.add(playerId);
      seen.add(playerId);
    }
  }
  return duplicates;
}

export function validateTournamentSquad(
  squad: TournamentSquad,
  ageGroups: Record<string, string>,
  options: { minFYouth: number; maxTeamSize: number; trainerRequired: boolean },
): SquadValidation {
  const fYouthCount = squad.playerIds.filter((id) => ageGroups[id] === "F-Jugend").length;
  return {
    fYouthCount,
    minimumMet: fYouthCount >= options.minFYouth,
    sizeExceeded: options.maxTeamSize > 0 && squad.playerIds.length > options.maxTeamSize,
    trainerMissing: options.trainerRequired && !squad.trainerId,
  };
}
