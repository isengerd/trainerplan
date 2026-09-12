import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";

const club = { id: "club", ownerUserId: "owner", licenseType: "single_team_pro" };
const user = { id: "owner", role: "admin", loginEnabled: true, managedProfile: false, activeTeamId: "team" };
const membership = { userId: user.id, clubId: club.id, teamId: "team", role: "admin", status: "active", team: { active: true }, club };
let writes = 0;
(globalThis as unknown as { prisma: PrismaClient }).prisma = {
  apiSession: { findUnique: async () => ({ user, expiresAt: new Date("2099-01-01") }) },
  user: { findUnique: async () => user },
  membership: { findMany: async () => [membership] },
  club: { findUnique: async () => club },
  $transaction: async () => { writes++; throw new Error("Unexpected database mutation"); },
} as unknown as PrismaClient;
process.env.AUTH_PROVIDER = "legacy";
process.env.LICENSE_SELF_SERVICE_ENABLED = "false";
process.env.PLATFORM_ADMIN_USER_IDS = "operator";

test("Direkte Upgrade- und Downgrade-Anfragen des Inhabers scheitern in Beta vor jedem Schreibzugriff", async () => {
  const route = await import("../app/api/v1/organization/license/route");
  for (const method of ["PUT", "DELETE"] as const) {
    const request = new NextRequest("https://nextsession.de/api/v1/organization/license", { method, headers: { authorization: "Bearer valid-session", "Content-Type": "application/json" }, body: JSON.stringify({ licenseType: method === "PUT" ? "club" : "single_team_free", confirmation: "TARIF WECHSELN" }) });
    const response = await route[method](request);
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /nicht freigeschaltet/);
  }
  assert.equal(writes, 0);
});
