import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, User } from "@prisma/client";
import { NextRequest } from "next/server";

// In-memory database boundary: any unexpected read or write fails. No real DB,
// Firebase account or production session is used by these authorization tests.
const parent = { id: "parent", role: "guardian", loginEnabled: true, managedProfile: false, activeTeamId: "team", email: "parent@example.org" } as User;
let licenseType = "single_team_pro";
let memberships: Array<{ id: string; userId: string; clubId: string; teamId: string; role: string; status: string; club: { licenseType: string }; team: { active: boolean } }>;
function resetMemberships() {
  memberships = [{ id: "membership", userId: parent.id, clubId: "club", teamId: "team", role: "guardian", status: "active", club: { get licenseType() { return licenseType; } }, team: { active: true } }];
}
resetMemberships();
const fake = {
  apiSession: { findUnique: async () => ({ user: parent, expiresAt: new Date("2099-01-01") }) },
  user: { findUnique: async () => parent },
  membership: { findMany: async () => memberships },
};
(globalThis as unknown as { prisma: PrismaClient }).prisma = fake as unknown as PrismaClient;
process.env.AUTH_PROVIDER = "legacy";
const request = (path = "/api/v1/bootstrap", method = "GET") => new NextRequest(`https://nextsession.de${path}`, { method, headers: { authorization: "Bearer existing-session" } });

test("eine bestehende Sitzung verliert nach Downgrade alle geschützten Kalenderzugriffe und funktioniert nach Upgrade wieder", async () => {
  const { authenticatedUser } = await import("./auth");
  const { activeClubScope } = await import("./club-context");
  const bootstrap = await import("../app/api/v1/bootstrap/route");
  const calendar = await import("../app/api/v1/calendar.ics/route");
  const attendance = await import("../app/api/v1/events/[id]/attendance/route");
  assert.equal((await authenticatedUser(request()))?.id, parent.id);
  licenseType = "single_team_free";
  assert.equal(await authenticatedUser(request()), null);
  await assert.rejects(activeClubScope(parent), /Zugriff|zugriff/);
  assert.equal((await bootstrap.GET(request())).status, 401);
  assert.equal((await calendar.GET(request("/api/v1/calendar.ics"))).status, 401);
  assert.equal((await attendance.PUT(request("/api/v1/events/event/attendance", "PUT"), { params: Promise.resolve({ id: "event" }) })).status, 401);
  licenseType = "single_team_pro";
  assert.equal((await authenticatedUser(request()))?.id, parent.id);
  assert.deepEqual(await activeClubScope(parent), { clubId: "club", teamId: "team" });
  assert.equal(parent.loginEnabled, true);
});

test("kein globaler Admin-Fallback bei gesperrter Mitgliedschaft; manuell deaktivierte Konten bleiben gesperrt", async () => {
  const { authorizedAccount } = await import("./account-access");
  licenseType = "single_team_free";
  assert.equal(await authorizedAccount({ ...parent, role: "admin" }), null);
  licenseType = "single_team_pro";
  assert.equal(await authorizedAccount({ ...parent, loginEnabled: false }), null);
  memberships = [];
  assert.equal(await authorizedAccount(parent), null);
  assert.equal((await authorizedAccount({ ...parent, role: "admin" }))?.role, "admin");
  resetMemberships();
});

test("bestehende Sitzung und Datenkontext wechseln nur zu einer erlaubten weiteren Mannschaft", async () => {
  const { authenticatedUser } = await import("./auth");
  const { activeClubScope } = await import("./club-context");
  licenseType = "single_team_free";
  memberships.push({ ...memberships[0], id: "other", clubId: "other-club", teamId: "other-team", club: { licenseType: "club" } });
  const authorized = await authenticatedUser(request());
  assert.equal(authorized?.activeTeamId, "other-team");
  await assert.rejects(activeClubScope(parent), /Zugriff|zugriff/);
  assert.deepEqual(await activeClubScope(authorized!), { clubId: "other-club", teamId: "other-team" });
  resetMemberships();
});
