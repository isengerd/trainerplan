import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, User } from "@prisma/client";
import { initialSettings, initialEvents } from "@/data/club";
import { library } from "@/data/demo";

const actor = { id: "owner", role: "admin", activeTeamId: "team", loginEnabled: true, managedProfile: false } as User;
const club = { id: "club", licenseType: "single_team_pro", ownerUserId: actor.id };
const membership = { userId: actor.id, role: "admin", status: "active", clubId: "club", teamId: "team", team: { active: true }, club };
let record: { clubId: string | null; teamId: string | null } | null;
let writes = 0;
const fake = {
  user: { findUnique: async () => actor },
  membership: { findMany: async () => [membership], count: async () => 0 },
  appConfig: { findUnique: async () => ({ settings: initialSettings }) },
  clubEvent: { findMany: async () => record ? [record] : [], deleteMany: async () => { writes++; }, upsert: async () => { writes++; } },
  exerciseRecord: { findUnique: async () => record, upsert: async () => { writes++; } },
  attendanceResponse: { deleteMany: async () => { writes++; } },
  $transaction: async (callback: (tx: unknown) => unknown, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "Serializable"); return callback(fake); },
};
(globalThis as unknown as { prisma: PrismaClient }).prisma = fake as unknown as PrismaClient;

test("Sammelspeicherung kann weder fremde noch unzugeordnete Termine übernehmen", async () => {
  const { saveEvents } = await import("./events");
  for (const value of [{ clubId: "other", teamId: "team" }, { clubId: "club", teamId: "other-team" }, { clubId: null, teamId: null }]) {
    record = value; writes = 0;
    await assert.rejects(saveEvents([{ ...initialEvents[0], responses: {} }], actor), /gehört nicht/);
    assert.equal(writes, 0);
  }
});

test("Übungen anderer Teams und der Systembibliothek können nicht durch POST übernommen werden", async () => {
  const { saveExercise } = await import("./exercises");
  for (const value of [{ clubId: "other", teamId: "team" }, { clubId: "club", teamId: "other-team" }, { clubId: null, teamId: null }]) {
    record = value; writes = 0;
    await assert.rejects(saveExercise(library[0], actor), /gehört nicht/);
    assert.equal(writes, 0);
  }
  record = { clubId: "club", teamId: "team" }; writes = 0;
  await saveExercise(library[0], actor);
  assert.equal(writes, 1);
});
