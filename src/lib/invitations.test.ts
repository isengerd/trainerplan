import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";
import { applicationUrl } from "./invitations";

const request = (origin: string) => ({ nextUrl: new URL(origin) }) as NextRequest;

test("öffentliche Links verwenden nextsession.de trotz Vercel-Aufruf und alter Konfiguration", () => {
  assert.equal(applicationUrl(request("https://deployment.vercel.app"), { NODE_ENV: "production", PUBLIC_APP_URL: "https://legacy.vercel.app" }), "https://nextsession.de");
  assert.equal(applicationUrl(request("https://nextsession.de"), { NODE_ENV: "production" }), "https://nextsession.de");
});

test("lokale Entwicklung behält ihre lokale URL", () => {
  assert.equal(applicationUrl(request("http://localhost:3000"), { NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(applicationUrl(request("http://localhost:3000"), { NODE_ENV: "development", PUBLIC_APP_URL: "http://127.0.0.1:3001/" }), "http://127.0.0.1:3001");
});
