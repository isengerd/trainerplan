import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { initialSettings } from "@/data/club";

const user = { id: "reader", name: "Reader", role: "admin", loginEnabled: true, managedProfile: false, activeTeamId: "team-a", birthday: null };
const club = { id: "club-a", name: "Club", ownerUserId: "someone-else", licenseType: "single_team_pro" };
const team = { id: "team-a", active: true, name: "A", _count: { memberships: 1 } };
const membership = { userId: user.id, clubId: club.id, teamId: team.id, role: "admin", status: "active", team, club, user: { ...user, childrenManaged: [] } };
const config = { settings: initialSettings, plans: {}, templates: [], planMeta: {} };
let allowed = true;
let eventReads = 0;
let squadReads = 0;
const fake = {
  apiSession: { findUnique: async () => ({ user, expiresAt: new Date("2099-01-01") }) },
  user: { findUnique: async () => user, findMany: async () => [user] },
  membership: { findMany: async (args: { where: { userId?: string } }) => {
    if (args.where.userId) assert.equal(args.where.userId, user.id);
    return allowed ? [membership] : [];
  } },
  club: { findUnique: async () => club },
  team: { findMany: async () => [team] },
  appConfig: { findUnique: async () => config, upsert: async () => config },
  exerciseRecord: { upsert: async () => ({}), findMany: async () => [] },
  clubEvent: { findFirst: async (args: { where: { id: string; clubId: string; teamId: string } }) => {
    assert.equal(args.where.clubId, "club-a");
    assert.equal(args.where.teamId, "team-a");
    assert.equal(args.where.id, "foreign-event");
    return null;
  }, findMany: async (args: { where: unknown }) => {
    eventReads++;
    // Reject broad OR clauses and any client-supplied foreign scope.
    assert.deepEqual(args.where, { clubId: "club-a", teamId: "team-a" });
    return [];
  } },
  tournamentSquad: { findMany: async (args: { where: unknown }) => {
    squadReads++;
    assert.deepEqual(args.where, { event: { clubId: "club-a", teamId: "team-a" } });
    return [];
  } },
  guardianPlayer: { findMany: async () => [] },
  teamGroup: { findMany: async () => [] },
  ageGroup: { findMany: async () => [] },
  invitation: { findMany: async () => [] },
};
(globalThis as unknown as { prisma: PrismaClient }).prisma = fake as unknown as PrismaClient;
process.env.AUTH_PROVIDER = "legacy";
process.env.SEED_DEMO_DATA = "false";
process.env.PLATFORM_ADMIN_USER_IDS = "operator";

test("Bootstrap ignoriert fremde Team- und Benutzer-IDs und begrenzt Termine und Einteilungen auf die Mitgliedschaft", async () => {
  const { GET } = await import("../app/api/v1/bootstrap/route");
  const response = await GET(new NextRequest("https://nextsession.de/api/v1/bootstrap?teamId=team-b&clubId=club-b&userId=victim", { headers: { authorization: "Bearer test-session" } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).organization.activeTeamId, "team-a");
  assert.equal(eventReads, 1);
  assert.equal(squadReads, 1);
});

test("Ohne Anmeldung werden vor jedem Team-Datenabruf 401 zurückgegeben", async () => {
  const { GET } = await import("../app/api/v1/bootstrap/route");
  eventReads = 0; squadReads = 0;
  assert.equal((await GET(new NextRequest("https://nextsession.de/api/v1/bootstrap"))).status, 401);
  assert.equal(eventReads + squadReads, 0);
});

test("Onboarding ohne Mitgliedschaft liefert keine Termine, Einteilungen oder Trainingspläne", async () => {
  allowed = false;
  user.activeTeamId = "";
  eventReads = 0; squadReads = 0;
  try {
    const { GET } = await import("../app/api/v1/bootstrap/route");
    const response = await GET(new NextRequest("https://nextsession.de/api/v1/bootstrap", { headers: { authorization: "Bearer test-session" } }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.setupRequired, true);
    assert.deepEqual(body.events, []);
    assert.deepEqual(body.tournamentPlans, []);
    assert.deepEqual(body.plans, {});
    const { getTrainingPlans } = await import("./training-plans");
    assert.deepEqual(await getTrainingPlans(user), { plans: {}, planMeta: {} });
    assert.equal(eventReads + squadReads, 0);
  } finally { allowed = true; user.activeTeamId = "team-a"; }
});

test("Ein leerer Teamkontext erweitert den Datenbankfilter nicht auf den gesamten Verein", async () => {
  const { scopedResourceWhere } = await import("./club-context");
  assert.deepEqual(scopedResourceWhere({ clubId: "club-a", teamId: null }), { clubId: "club-a", teamId: null });
});

test("Eine erratene fremde Termin-ID liefert 404 vor dem Laden der Einteilung", async () => {
  squadReads = 0;
  const { GET } = await import("../app/api/v1/events/[id]/squads/route");
  const response = await GET(new NextRequest("https://nextsession.de/api/v1/events/foreign-event/squads", { headers: { authorization: "Bearer test-session" } }), { params: Promise.resolve({ id: "foreign-event" }) });
  assert.equal(response.status, 404);
  assert.equal(squadReads, 0);
});

test("Neue Teamkonfiguration kopiert keine privaten Trainingsinhalte aus dem Vereins-Fallback", async () => {
  const db = fake.appConfig as unknown as { findUnique: (args: { where: { id: string } }) => Promise<unknown>; create?: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  const previous = db.findUnique;
  db.findUnique = async ({ where }) => where.id === "team-new" ? null : { ...config, plans: { private: ["secret"] }, templates: ["private"], planMeta: { private: {} } };
  db.create = async ({ data }) => data;
  try {
    const { ensureClubConfig } = await import("./club-context");
    const result = await ensureClubConfig({ clubId: "club-a", teamId: "new" });
    assert.deepEqual(result?.plans, {});
    assert.deepEqual(result?.templates, []);
    assert.deepEqual(result?.planMeta, {});
  } finally { db.findUnique = previous; delete db.create; }
});
