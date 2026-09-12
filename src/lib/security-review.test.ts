import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { readJson } from "./api-security";
import { hasAccessManagement, hasMultipleTeams } from "./license";
import { middleware } from "../middleware";

test("Unbekannte Tarife und ungültige Ablaufdaten schalten keine Pro-Rechte frei", () => {
  assert.equal(hasAccessManagement("unknown"), false);
  assert.equal(hasAccessManagement("club", "invalid"), false);
  assert.equal(hasMultipleTeams("club", "invalid"), false);
  assert.equal(hasAccessManagement("single_team"), true);
});

test("JSON-Limit stoppt einen Stream ohne Content-Length vor dem vollständigen Einlesen", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { cancelled = true; } });
  const request = { headers: new Headers(), body: stream } as unknown as NextRequest;
  await assert.rejects(readJson(request, 10), (error: unknown) => (error as { status: number }).status === 413);
  assert.equal(cancelled, true);
});

test("JSON kann UTF-8-Zeichen über mehrere Stream-Blöcke hinweg lesen", async () => {
  const bytes = new TextEncoder().encode('{"name":"Jörg"}');
  const body = new ReadableStream<Uint8Array>({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
  assert.deepEqual(await readJson({ headers: new Headers(), body } as unknown as NextRequest), { name: "Jörg" });
});

test("CSRF: fremde oder fehlende Herkunft wird abgewiesen, gleiche Herkunft akzeptiert", () => {
  for (const origin of [undefined, "https://attacker.example", "https://nextsession.de.attacker.example"]) {
    const headers: Record<string, string> = origin ? { origin } : {};
    assert.equal(middleware(new NextRequest("https://nextsession.de/api/v1/users", { method: "PUT", headers })).status, 403);
  }
  assert.equal(middleware(new NextRequest("https://nextsession.de/api/v1/users", { method: "PUT", headers: { origin: "https://nextsession.de", "sec-fetch-site": "same-origin" } })).status, 200);
});
