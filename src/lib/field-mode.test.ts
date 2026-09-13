import assert from "node:assert/strict";
import test from "node:test";
import { library } from "@/data/demo";
import { createFieldSession, pauseTimer, remainingTime, readFieldSession, saveFieldSession, setFieldOwner, clearFieldSessions } from "./field-mode";

const storage: Record<string, unknown> = {};
Object.defineProperties(storage, {
  getItem: { value: (key: string) => storage[key] ?? null },
  setItem: { value: (key: string, value: string) => { storage[key] = value; } },
  removeItem: { value: (key: string) => { delete storage[key]; } },
});
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
const create = () => createFieldSession({ owner: "coach-a", teamId: "team-a", teamName: "Test", title: "Training", date: "2026-09-14", players: 12, exercises: [{ ...library[0], trainerId: "private-coach-id", internalTeam: "A" }] });

test("Platzmodus speichert vollständige Übungen ohne Personalzuordnung und stellt Fortschritt wieder her", () => {
  setFieldOwner("coach-a");
  const session = { ...create(), started: true, endAt: Date.now() + 30000 };
  saveFieldSession(session);
  const saved = readFieldSession(session.id)!;
  assert.equal(saved.endAt, session.endAt);
  assert.equal(saved.exercises[0].setup, library[0].setup);
  assert.equal(saved.exercises[0].trainerId, null);
  assert.equal(saved.exercises[0].internalTeam, null);
  setFieldOwner("coach-b");
  assert.equal(readFieldSession(session.id), null);
  assert.throws(() => saveFieldSession(session));
  clearFieldSessions();
});

test("Timer ist unabhängig von Intervall-Ticks, hält Pause und erlaubt Überziehen", () => {
  const session = { ...create(), endAt: 100000, remaining: 60000 };
  assert.equal(remainingTime(session, 80000), 20000);
  assert.equal(remainingTime(session, 110000), -10000);
  const paused = pauseTimer(session, 80000);
  assert.equal(remainingTime(paused, 900000), 20000);
  assert.equal(remainingTime({ ...paused, endAt: 900000 + paused.remaining }, 910000), 10000);
  assert.equal(remainingTime({ ...session, endAt: session.endAt + 120000 }, 110000), 110000);
});

test("Leere Pläne und beschädigte lokale Snapshots werden abgewiesen", () => {
  const session = create();
  assert.throws(() => createFieldSession({ ...session, exercises: [] }));
  setFieldOwner(session.owner);
  saveFieldSession(session);
  storage[`nextsession-field:${session.id}`] = JSON.stringify({ ...session, index: 200 });
  assert.equal(readFieldSession(session.id), null);
  storage[`nextsession-field:${session.id}`] = "invalid";
  assert.equal(readFieldSession(session.id), null);
});
