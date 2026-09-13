import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, User } from "@prisma/client";
import { NextRequest } from "next/server";

const club = { id: "club", ownerUserId: "admin", licenseType: "single_team_pro" };
const account = (id: string, role: string) => ({ id, role, name: id, email: `${id}@example.org`, loginEnabled: true, managedProfile: false, activeTeamId: "team", position: "Allrounder", birthday: null, phone: "123", dribblingRating: 5, shootingRating: 4, passingRating: 3, internalTeam: "A", childrenManaged: role === "guardian" ? [{ playerId: "child" }] : [] });
let actor = account("parent", "guardian");
const child = account("child", "player");
const membership = (user: ReturnType<typeof account>) => ({ user, userId: user.id, clubId: "club", teamId: "team", role: user.role, status: "active", club, team: { active: true } });
(globalThis as unknown as { prisma: PrismaClient }).prisma = {
  apiSession: { findUnique: async () => ({ user: actor, expiresAt: new Date("2099-01-01") }) },
  user: { findUnique: async () => actor, findMany: async () => [actor] },
  membership: { findMany: async (args: { where: { userId?: string } }) => args.where.userId ? [membership(actor)] : [membership(actor), membership(child)] },
  club: { findUnique: async () => club },
} as unknown as PrismaClient;
process.env.AUTH_PROVIDER = "legacy";

test("Eltern und Spieler erhalten auch für eigene Profile keine internen Trainerbewertungen", async () => {
  const { getUsers } = await import("./users");
  for (const role of ["guardian", "player"]) {
    actor = account("parent", role);
    const users = await getUsers(actor as unknown as User);
    assert.ok(users.length > 0);
    for (const user of users) {
      assert.equal(user.dribblingRating, 0);
      assert.equal(user.shootingRating, 0);
      assert.equal(user.passingRating, 0);
      assert.equal(user.internalTeam, null);
    }
  }
  actor = account("admin", "admin");
  const users = await getUsers(actor as unknown as User);
  assert.equal(users.find((user) => user.id === child.id)?.dribblingRating, 5);
});

test("Auch /auth/me liefert Spielern und Eltern keine internen Werte des eigenen Kontos", async () => {
  const { GET } = await import("../app/api/v1/auth/me/route");
  for (const role of ["player", "guardian"]) {
    actor = account("self", role);
    const response = await GET(new NextRequest("https://nextsession.de/api/v1/auth/me", { headers: { authorization: "Bearer synthetic-test-session" } }));
    assert.equal(response.status, 200);
    const { user } = await response.json();
    assert.equal(user.dribblingRating, 0);
    assert.equal(user.shootingRating, 0);
    assert.equal(user.passingRating, 0);
    assert.equal(user.internalTeam, null);
    assert.equal(actor.dribblingRating, 5);
    assert.equal(actor.internalTeam, "A");
  }
});
