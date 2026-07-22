import assert from "node:assert/strict";
import test from "node:test";
import type { TournamentSquad } from "@/data/club";
import { duplicateTournamentPlayers, validateTournamentSquad } from "./tournament-planning";

const squad = (id: string, playerIds: string[], trainerId: string | null = "coach-1"): TournamentSquad => ({
  id, eventId: "event-1", name: id, trainerId, playerIds,
});

test("F-Jugend-Minimum wird als Warnung ausgewertet", () => {
  const result = validateTournamentSquad(squad("team-1", ["p1", "p2"]), { p1: "F-Jugend", p2: "E-Jugend" }, { minFYouth: 2, maxTeamSize: 6, trainerRequired: true });
  assert.equal(result.fYouthCount, 1);
  assert.equal(result.minimumMet, false);
  assert.equal(result.sizeExceeded, false);
});

test("Doppelzuweisungen werden turnierweit erkannt", () => {
  const duplicates = duplicateTournamentPlayers([squad("team-1", ["p1", "p2"]), squad("team-2", ["p2", "p3"])]);
  assert.deepEqual([...duplicates], ["p2"]);
});

test("Teamgröße und Trainerpflicht werden getrennt bewertet", () => {
  const result = validateTournamentSquad(squad("team-1", ["p1", "p2", "p3"], null), { p1: "F-Jugend", p2: "F-Jugend", p3: "F-Jugend" }, { minFYouth: 3, maxTeamSize: 2, trainerRequired: true });
  assert.equal(result.minimumMet, true);
  assert.equal(result.sizeExceeded, true);
  assert.equal(result.trainerMissing, true);
});
