import assert from "node:assert/strict";
import test from "node:test";
import { library } from "../data/demo";
import { rateLimit } from "./api-security";
import { validateEvents, validateExercises, validatePlans, validateUsers } from "./validators";

test("die mitgelieferte Übungsbibliothek erfüllt das API-Schema", () => {
  assert.equal(validateExercises(library).length, library.length);
});

test("fremde Videoanbieter werden nicht als YouTube-Link gespeichert", () => {
  const exercise = { ...library[0], id: "unsafe-video", youtubeUrl: "https://example.org/video/123456" };
  assert.throws(() => validateExercises([exercise]), /YouTube/);
});

test("ungültige Kalenderdaten und doppelte Termin-IDs werden abgewiesen", () => {
  const event = {
    id: "event-test", type: "training", title: "Training", date: "2026-02-30",
    startTime: "17:00", endTime: "18:00", meetingTime: "16:50", location: "Platz",
    description: "Test", maxParticipants: 12, responses: {},
  };
  assert.throws(() => validateEvents([event]), /Datum/);
  assert.throws(() => validateEvents([{ ...event, date: "2026-02-28" }, { ...event, date: "2026-02-28" }]), /doppelte IDs/);
});

test("das lokale Rate-Limit sperrt erst nach dem erlaubten Kontingent", () => {
  const key = `test-${crypto.randomUUID()}`;
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  assert.equal(rateLimit(key, 2, 60_000).allowed, false);
});

test("Spielerbewertungen akzeptieren nur null bis fünf Sterne und Team A oder B", () => {
  const player = {
    id: "player-test", name: "Test Spieler", email: "test@example.org", role: "player",
    position: "Allrounder", phone: "", birthday: "2017-01-01", ageGroup: "F-Jugend",
    groupId: null, dribblingRating: 5, shootingRating: 3, passingRating: 4, internalTeam: "A",
  };
  assert.equal(validateUsers([player], "coach-1", true)[0].internalTeam, "A");
  assert.throws(() => validateUsers([{ ...player, shootingRating: 6 }], "coach-1", true), /Schuss-Bewertung/);
  assert.throws(() => validateUsers([{ ...player, internalTeam: "C" }], "coach-1", true), /Internes Team/);
});

test("einzelne Übungen speichern optionale Trainer- und Teamzuordnungen validiert", () => {
  const assignedExercise = { ...library[0], trainerId: "coach-1", internalTeam: "B" };
  const result = validatePlans({ plans: { "2026-07-24": [assignedExercise] }, planMeta: { "2026-07-24": { name: "Teamtraining", focus: ["Passen"] } } });
  assert.equal((result.plans["2026-07-24"] as typeof assignedExercise[])[0].internalTeam, "B");
  assert.equal((result.plans["2026-07-24"] as typeof assignedExercise[])[0].trainerId, "coach-1");
  assert.throws(() => validatePlans({ plans: { "2026-07-24": [{ ...assignedExercise, internalTeam: "C" }] }, planMeta: { "2026-07-24": { name: "Teamtraining", focus: [] } } }), /Internes Team/);
});
