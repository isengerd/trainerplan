import assert from "node:assert/strict";
import test from "node:test";
import { readAuthResponse } from "./auth-response";

test("Login zeigt bei HTML-Serverfehlern eine verständliche Meldung ohne Antwortinhalt", async () => {
  await assert.rejects(readAuthResponse(new Response("<html>private runtime details</html>", { status: 500 })), (error: Error) => {
    assert.match(error.message, /Anmeldedienst.*HTTP 500/);
    assert.ok(!error.message.includes("private"));
    return true;
  });
});

test("Gültige Auth-JSON-Antworten bleiben unverändert", async () => {
  assert.deepEqual(await readAuthResponse(Response.json({ error: "Ungültige Anmeldung" }, { status: 401 })), { error: "Ungültige Anmeldung" });
  assert.deepEqual(await readAuthResponse(Response.json({ user: { id: "test" } })), { user: { id: "test" } });
});
