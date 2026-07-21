import assert from "node:assert/strict";
import test from "node:test";
import { library } from "../data/demo";
import { rateLimit } from "./api-security";
import { validateEvents, validateExercises } from "./validators";

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
