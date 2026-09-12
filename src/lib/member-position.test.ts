import assert from "node:assert/strict";
import test from "node:test";
import { positionForRole } from "./member-position";

test("Veraltete Trainerposition wird in einer Spielermannschaft als Allrounder aufgelöst", () => {
  assert.equal(positionForRole("player", "Trainer"), "Allrounder");
  assert.equal(positionForRole("player", "Vereinsadmin"), "Allrounder");
});

test("Gültige Spezialisierungen bleiben erhalten", () => {
  assert.equal(positionForRole("player", "Tor"), "Tor");
  assert.equal(positionForRole("trainer", "Torwarttrainer"), "Torwarttrainer");
  assert.equal(positionForRole("guardian", "Erziehungsberechtigt"), "Erziehungsberechtigt");
});

test("Dasselbe Profil wird je Mannschaftsrolle aufgelöst, ohne Rollen zu ändern", () => {
  const profile = { position: "Trainer" };
  assert.equal(positionForRole("trainer", profile.position), "Trainer");
  assert.equal(positionForRole("guardian", profile.position), "Elternteil");
  assert.equal(positionForRole("admin", profile.position), "Vereinsadmin");
  assert.equal(profile.position, "Trainer");
});
