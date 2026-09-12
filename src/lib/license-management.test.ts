import assert from "node:assert/strict";
import test from "node:test";
import { canManageLicense, licenseSelfServiceEnabled } from "./license-management";

test("Beta sperrt Lizenzänderungen auch für Inhaber; nur explizite Plattform-IDs bleiben freigeschaltet", () => {
  const saved = { toggle: process.env.LICENSE_SELF_SERVICE_ENABLED, ids: process.env.PLATFORM_ADMIN_USER_IDS };
  process.env.PLATFORM_ADMIN_USER_IDS = "operator";
  try {
    for (const value of [undefined, "false", "1", "TRUE"]) {
      if (value === undefined) delete process.env.LICENSE_SELF_SERVICE_ENABLED;
      else process.env.LICENSE_SELF_SERVICE_ENABLED = value;
      assert.equal(licenseSelfServiceEnabled(), false);
      assert.equal(canManageLicense("owner", "owner"), false);
      assert.equal(canManageLicense("trainer", "owner"), false);
      assert.equal(canManageLicense("operator", "owner"), true);
    }
    process.env.LICENSE_SELF_SERVICE_ENABLED = "true";
    assert.equal(canManageLicense("owner", "owner"), true);
    assert.equal(canManageLicense("trainer", "owner"), false);
    assert.equal(canManageLicense("operator", "owner"), true);
  } finally {
    if (saved.toggle === undefined) delete process.env.LICENSE_SELF_SERVICE_ENABLED; else process.env.LICENSE_SELF_SERVICE_ENABLED = saved.toggle;
    if (saved.ids === undefined) delete process.env.PLATFORM_ADMIN_USER_IDS; else process.env.PLATFORM_ADMIN_USER_IDS = saved.ids;
  }
});
