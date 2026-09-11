import assert from "node:assert/strict";
import test from "node:test";
import { membershipAllowsAccess, selectAccessibleMembership } from "./membership-access";

const membership = (role: string, licenseType = "single_team_pro", teamId = "team") => ({ teamId, role, status: "active", team: { active: true }, club: { licenseType, licenseExpiresAt: null as string | null } });

test("Free erlaubt Eltern und Spieler, sperrt Trainer und erhält die Administration", () => {
  for (const role of ["guardian", "player"]) {
    assert.equal(membershipAllowsAccess(membership(role)), true);
    assert.equal(membershipAllowsAccess(membership(role, "single_team_free")), true);
  }
  assert.equal(membershipAllowsAccess(membership("admin", "single_team_free")), true);
  assert.equal(membershipAllowsAccess(membership("trainer", "single_team_free")), false);
});

test("Ablauf, unbekannte Lizenz, inaktive Mannschaft und gesperrte Mitgliedschaft geben keinen Zugriff", () => {
  const parent = membership("guardian");
  for (const denied of [
    { ...parent, role: "trainer", club: { licenseType: "club", licenseExpiresAt: "2000-01-01" } },
    { ...parent, club: { licenseType: "club", licenseExpiresAt: "invalid" } },
    membership("guardian", "unknown"),
    { ...parent, team: { active: false } },
    { ...parent, status: "suspended" },
    { ...parent, teamId: null, team: null },
  ]) assert.equal(membershipAllowsAccess(denied), false);
});

test("Mehrfachzugehörigkeit: nur freigeschaltete Mannschaften und deren Rolle auswählen", () => {
  const blocked = { ...membership("guardian", "single_team_free", "blocked"), status: "suspended" };
  const allowed = membership("guardian", "club", "allowed");
  assert.equal(selectAccessibleMembership([blocked, allowed], "blocked"), allowed);
  assert.equal(selectAccessibleMembership([blocked], "blocked"), null);
  const adminElsewhere = membership("admin", "single_team_free", "admin-team");
  assert.equal(selectAccessibleMembership([blocked, adminElsewhere], "blocked")?.role, "admin");
  assert.equal(membershipAllowsAccess(blocked), false);
});

test("Downgrade erhält Elternzugang, Mitgliedschaft und Elternlinks", () => {
  const parent = membership("guardian");
  const links = [{ guardianId: "parent", playerId: "child" }];
  assert.equal(selectAccessibleMembership([parent], "team"), parent);
  parent.club.licenseType = "single_team_free";
  assert.equal(selectAccessibleMembership([parent], "team"), parent);
  parent.club.licenseType = "single_team_pro";
  assert.equal(selectAccessibleMembership([parent], "team"), parent);
  assert.equal(parent.status, "active");
  assert.deepEqual(links, [{ guardianId: "parent", playerId: "child" }]);
});
