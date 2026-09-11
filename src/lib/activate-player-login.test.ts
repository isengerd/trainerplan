import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { activatePlayerLogin } from "./activate-player-login";

const input = { playerId: "existing-player", clubId: "club", teamId: "team", email: "player@example.org", firebaseUid: "firebase-player" };
function database(licenseType = "single_team_pro", member = true, expiresAt: Date | null = null) {
  const player = { id: input.playerId, birthday: "2010-09-11", name: "Spieler 1", managedProfile: true, loginEnabled: false, firebaseUid: null as string | null, email: "player@profiles.invalid" };
  const parentLinks = [{ guardianId: "parent", playerId: player.id }];
  let updates = 0;
  const tx = {
    club: { findUniqueOrThrow: async () => ({ licenseType, licenseExpiresAt: expiresAt }) },
    membership: { findFirst: async ({ where }: { where: Record<string, unknown> }) => { assert.equal(where.userId, player.id); assert.equal(where.teamId, input.teamId); assert.equal(where.status, "active"); return member ? { id: "membership" } : null; } },
    user: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<typeof player> }) => {
        updates++;
        assert.equal(where.id, player.id);
        if (!player.managedProfile || player.loginEnabled || player.firebaseUid) return { count: 0 };
        Object.assign(player, data); return { count: 1 };
      },
      findUniqueOrThrow: async () => player,
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, player, parentLinks, updates: () => updates };
}

test("eigener Zugang verwendet dasselbe Spielerprofil und erhält Geburtsdatum und Elternzuordnung", async () => {
  const db = database();
  const result = await activatePlayerLogin(db.tx, input);
  assert.equal(result.id, "existing-player");
  assert.equal(db.player.birthday, "2010-09-11");
  assert.equal(db.player.name, "Spieler 1");
  assert.equal(db.player.email, input.email);
  assert.equal(db.player.loginEnabled, true);
  assert.equal(db.player.managedProfile, false);
  assert.deepEqual(db.parentLinks, [{ guardianId: "parent", playerId: "existing-player" }]);
  await assert.rejects(activatePlayerLogin(db.tx, input), /bereits/);
});

test("entfernte Mannschaftszugehörigkeit verhindert Aktivierung", async () => {
  for (const db of [database("single_team_pro", false)]) {
    await assert.rejects(activatePlayerLogin(db.tx, input));
    assert.equal(db.updates(), 0);
    assert.equal(db.player.managedProfile, true);
    assert.equal(db.player.email, "player@profiles.invalid");
  }
});

test("nach Upgrade kann das in Free angelegte Profil unverändert aktiviert werden", async () => {
  const db = database("club");
  await activatePlayerLogin(db.tx, input);
  assert.equal(db.player.id, input.playerId);
  assert.equal(db.player.firebaseUid, input.firebaseUid);
});

test("eigener Spielerzugang kann auch in Free und nach Ablauf von Pro aktiviert werden", async () => {
  for (const db of [database("single_team_free"), database("single_team_pro", true, new Date("2000-01-01"))]) {
    await activatePlayerLogin(db.tx, input);
    assert.equal(db.player.loginEnabled, true);
    assert.equal(db.player.id, input.playerId);
  }
});
