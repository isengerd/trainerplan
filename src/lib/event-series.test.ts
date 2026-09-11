import assert from "node:assert/strict";
import test from "node:test";
import type { ClubEvent } from "../data/club";
import { eventDeletionWhere, expandEventOccurrences } from "./event-series";

const training: ClubEvent = {
  id: "first", type: "training", title: "Training F2", date: "2026-09-11",
  startTime: "17:00", endTime: "18:00", meetingTime: "16:50", location: "Sportplatz",
  description: "", maxParticipants: 0, responses: {}, repeatFrequency: "weekly", repeatUntil: "2026-10-02",
};

test("All occurrences share one server-created series ID, but separate creations do not", () => {
  const first = expandEventOccurrences(training);
  const second = expandEventOccurrences(training);
  assert.deepEqual(first.map((event) => event.date), ["2026-09-11", "2026-09-18", "2026-09-25", "2026-10-02"]);
  assert.equal(new Set(first.map((event) => event.seriesId)).size, 1);
  assert.ok(first[0].seriesId);
  assert.notEqual(first[0].seriesId, second[0].seriesId);
  assert.equal(new Set(first.map((event) => event.id)).size, 4);
  assert.ok(first.every((event) => event.repeatFrequency === "none" && !event.repeatUntil));
});

test("A standalone copy cannot inherit a client-provided series ID", () => {
  const [copy] = expandEventOccurrences({ ...training, repeatFrequency: "none", seriesId: "existing-series" });
  assert.equal(copy.seriesId, undefined);
});

test("Following includes the selected day and later occurrences, never earlier days, other teams or unrelated series", () => {
  const date = new Date("2026-09-18T00:00:00Z");
  const anchor = { id: "selected", clubId: "club-a", teamId: "team-a", seriesId: "series-a", date };
  const where = eventDeletionWhere(anchor, "following");
  assert.deepEqual(where, { clubId: "club-a", teamId: "team-a", seriesId: "series-a", date: { gte: date } });
  const events = [
    { ...anchor, id: "earlier", date: new Date("2026-09-11") }, anchor,
    { ...anchor, id: "later", date: new Date("2026-09-25") },
    { ...anchor, id: "other-series", seriesId: "series-b" },
    { ...anchor, id: "other-team", teamId: "team-b" },
    { ...anchor, id: "other-club", clubId: "club-b" },
  ];
  if (!("date" in where) || !where.date) throw new Error("Missing date boundary");
  const boundary = where.date.gte;
  assert.deepEqual(events.filter((event) => event.clubId === where.clubId && event.teamId === where.teamId && event.seriesId === where.seriesId && event.date >= boundary).map((event) => event.id), ["selected", "later"]);
});

test("Single deletion targets only one ID, and legacy events cannot trigger a series deletion", () => {
  const event = { id: "one", clubId: "club", teamId: null, seriesId: null, date: new Date("2026-09-18") };
  assert.deepEqual(eventDeletionWhere(event, "single"), { clubId: "club", teamId: null, id: "one" });
  assert.throws(() => eventDeletionWhere(event, "following"), /keiner gespeicherten Serie/);
});

test("Month-end recurrence retains its original day and series limit still applies", () => {
  const months = expandEventOccurrences({ ...training, date: "2026-01-31", repeatFrequency: "monthly", repeatUntil: "2026-03-31" });
  assert.deepEqual(months.map((event) => event.date), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.throws(() => expandEventOccurrences({ ...training, repeatFrequency: "daily", repeatUntil: "2027-09-11" }), /höchstens 200/);
});
