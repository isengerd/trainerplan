import assert from "node:assert/strict";
import test from "node:test";
import { firebaseIdentityMatches, isRecentFirebaseSignIn, tenantScopedResult } from "./auth-policy";

test("a Firebase identity cannot claim an account by email alone", () => {
  assert.equal(firebaseIdentityMatches({ firebaseUid: null, email: "admin@example.org" }, { uid: "attacker", email: "admin@example.org" }), false);
  assert.equal(firebaseIdentityMatches({ firebaseUid: "owner", email: "admin@example.org" }, { uid: "attacker", email: "admin@example.org" }), false);
  assert.equal(firebaseIdentityMatches({ firebaseUid: "owner", email: "admin@example.org" }, { uid: "owner", email: "other@example.org" }), false);
  assert.equal(firebaseIdentityMatches({ firebaseUid: "owner", email: "Admin@example.org" }, { uid: "owner", email: "admin@example.org" }), true);
});

test("session exchange accepts only a recent sign-in", () => {
  assert.equal(isRecentFirebaseSignIn(1_000, 1_299), true);
  assert.equal(isRecentFirebaseSignIn(1_000, 1_301), false);
  assert.equal(isRecentFirebaseSignIn(1_100, 1_000), false);
});

test("tenant-scoped queries are never executed without a tenant", async () => {
  let queried = false;
  const result = await tenantScopedResult(false, async () => { queried = true; return ["secret"]; });
  assert.deepEqual(result, []);
  assert.equal(queried, false);
});
