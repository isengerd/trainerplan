import assert from "node:assert/strict";
import test from "node:test";
import type { Invitation, Prisma } from "@prisma/client";
import { invitationAllowsAccess, transferOwnership } from "./ownership";

const invitation = { id: "invite", clubId: "club", teamId: "team", invitedById: "owner", role: "admin", email: "successor@example.org", ownershipTransfer: true } as Invitation;
const access = { ...invitation, team: { active: true }, club: { ownerUserId: "owner", licenseType: "single_team_free", licenseExpiresAt: null } };

test("Übergabe gilt in Free nur vom aktuellen Inhaber und für eine aktive Mannschaft", () => {
  assert.equal(invitationAllowsAccess(access), true);
  assert.equal(invitationAllowsAccess({ ...access, ownershipTransfer: false }), false);
  assert.equal(invitationAllowsAccess({ ...access, email: "" }), false);
  assert.equal(invitationAllowsAccess({ ...access, club: { ...access.club, ownerUserId: "new-owner" } }), false);
  assert.equal(invitationAllowsAccess({ ...access, team: { active: false } }), false);
  assert.equal(invitationAllowsAccess({ ...access, role: "player" }), false);
});

function boundary({ changed = 1, managed = false, active = true } = {}) {
  const writes: Array<{ operation: string; args: unknown }> = [];
  const record = (operation: string, result: unknown = {}) => async (args: unknown) => { writes.push({ operation, args }); return result; };
  const tx = {
    user: { findUniqueOrThrow: async () => ({ loginEnabled: true, managedProfile: managed }), update: record("user.update") },
    team: { findFirst: async () => active ? { id: "team" } : null },
    club: { updateMany: record("club.updateMany", { count: changed }) },
    membership: { updateMany: record("membership.updateMany"), upsert: record("membership.upsert") },
    invitation: { deleteMany: record("invitation.deleteMany") },
  } as unknown as Prisma.TransactionClient;
  return { tx, writes };
}

test("Übergabe überträgt den Inhaber, erhält Historie und macht den bisherigen Admin zum Trainer", async () => {
  const { tx, writes } = boundary();
  await transferOwnership(tx, invitation, "successor");
  assert.deepEqual(writes[0], { operation: "club.updateMany", args: { where: { id: "club", ownerUserId: "owner" }, data: { ownerUserId: "successor" } } });
  assert.equal(writes.filter((w) => w.operation === "membership.updateMany").length, 2);
  const membership = writes.find((w) => w.operation === "membership.upsert")!.args as { update: unknown; create: { userId: string } };
  assert.deepEqual(membership.update, { role: "admin", clubAdmin: true, status: "active" });
  assert.equal(membership.create.userId, "successor");
  assert.equal(writes.some((w) => w.operation.includes("user.delete")), false);
});

test("Konkurrierende Übergabe verliert den Eigentümervergleich und ändert keine Mitgliedschaften", async () => {
  const { tx, writes } = boundary({ changed: 0 });
  await assert.rejects(transferOwnership(tx, invitation, "successor"), /inzwischen geändert/);
  assert.deepEqual(writes.map((w) => w.operation), ["club.updateMany"]);
});

test("Kinderkonten, archivierte Mannschaften und Selbstübergabe werden vor Schreibzugriff abgewiesen", async () => {
  for (const options of [{ managed: true }, { active: false }]) {
    const { tx, writes } = boundary(options);
    await assert.rejects(transferOwnership(tx, invitation, "successor"));
    assert.equal(writes.length, 0);
  }
  const { tx, writes } = boundary();
  await assert.rejects(transferOwnership(tx, invitation, "owner"));
  assert.equal(writes.length, 0);
});

test("Eine Übergabe entzieht dem explizit freigeschalteten Plattformkonto nicht seinen Adminzugang", async () => {
  const previous = process.env.PLATFORM_ADMIN_USER_IDS;
  process.env.PLATFORM_ADMIN_USER_IDS = "owner";
  try {
    const { tx, writes } = boundary();
    await transferOwnership(tx, invitation, "successor");
    assert.equal(writes.filter((w) => w.operation === "membership.updateMany").length, 1);
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_ADMIN_USER_IDS;
    else process.env.PLATFORM_ADMIN_USER_IDS = previous;
  }
});
