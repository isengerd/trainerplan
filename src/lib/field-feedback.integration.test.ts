import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";

const user = { id: "coach", role: "trainer", loginEnabled: true, managedProfile: false, activeTeamId: "team" };
let writes = 0;
(globalThis as unknown as { prisma: PrismaClient }).prisma = {
  apiSession: { findUnique: async () => ({ user, expiresAt: new Date("2099-01-01") }) },
  user: { findUnique: async () => user },
  membership: { findMany: async () => [{ userId: user.id, clubId: "club", teamId: "team", role: user.role, status: "active", team: { active: true }, club: { licenseType: "single_team_pro" } }] },
  trainingFeedback: { upsert: async (args: { create: { userId: string; teamId: string; rating: number } }) => { writes++; assert.equal(args.create.userId, "coach"); assert.equal(args.create.teamId, "team"); } },
} as unknown as PrismaClient;
process.env.AUTH_PROVIDER = "legacy";
test("Offline-Bewertung ist an echte Sitzung, Mannschaft und Trainerrolle gebunden", async () => {
  const { POST } = await import("../app/api/v1/training-feedback/route");
  const send = (patch = {}) => POST(new NextRequest("https://nextsession.de/api/v1/training-feedback", { method: "POST", headers: { authorization: "Bearer synthetic-session", "content-type": "application/json" }, body: JSON.stringify({ userId: "forged", teamId: "team", sessionId: "s", exerciseId: "e", date: "2026-09-14", rating: 3, ...patch }) }));
  assert.equal((await send({ teamId: "foreign" })).status, 403);
  assert.equal((await send({ rating: 99 })).status, 400);
  assert.equal((await send({ date: "2026-02-30" })).status, 400);
  assert.equal(writes, 0);
  assert.equal((await send()).status, 200);
  assert.equal(writes, 1);
  user.role = "player";
  assert.equal((await send()).status, 403);
  assert.equal(writes, 1);
});
