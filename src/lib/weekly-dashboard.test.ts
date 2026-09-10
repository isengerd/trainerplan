import assert from "node:assert/strict";
import test from "node:test";
import { initialSettings, type ClubEvent, type ClubUser } from "../data/club";
import { attendanceCounts, berlinDateKey, eventHasEnded, eventTimestamp, getWeek, preparationTasks, trainingIdea, trainingTitle, type DashboardInput } from "./weekly-dashboard";

const now = new Date("2026-09-10T10:00:00Z");
const player = (id: string, role: ClubUser["role"] = "player") => ({ id, role, name: id, ageGroup: "F-Jugend" } as ClubUser);
const event = (patch: Partial<ClubEvent> = {}): ClubEvent => ({ id: "training", type: "training", title: "F2 Training", date: "2026-09-10", startTime: "17:00", endTime: "18:00", meetingTime: "16:50", location: "Sportplatz", description: "", maxParticipants: 0, trainerIds: ["coach"], responses: {}, ...patch });
const input = (patch: Partial<DashboardInput> = {}): DashboardInput => ({ events: [], users: [player("p1"), player("p2"), player("p3"), player("coach", "trainer")], plans: {}, planMeta: {}, tournamentPlans: [], settings: initialSettings, ...patch });

test("Attendance separates missing answers from uncertainty and ignores users outside the player roster", () => {
  assert.deepEqual(attendanceCounts(event({ responses: { p1: "yes", p2: "maybe", ghost: "yes", coach: "yes" } }), input().users), { yes: 1, no: 0, maybe: 1, unanswered: 1, total: 3 });
  assert.deepEqual(attendanceCounts(event(), []), { yes: 0, no: 0, maybe: 0, unanswered: 0, total: 0 });
});

test("ISO weeks and Berlin day boundaries work across a year change", () => {
  assert.equal(berlinDateKey(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
  const week = getWeek("2027-01-01");
  assert.equal(week.start, "2026-12-28");
  assert.equal(week.end, "2027-01-03");
  assert.equal(week.number, 53);
  assert.equal(getWeek("2027-01-04").number, 1);
});

test("Event times use Berlin summer/winter time regardless of device timezone", () => {
  assert.equal(eventTimestamp("2026-09-10", "17:00"), Date.parse("2026-09-10T15:00:00Z"));
  assert.equal(eventTimestamp("2026-12-10", "17:00"), Date.parse("2026-12-10T16:00:00Z"));
  assert.equal(eventTimestamp("2026-03-29", "17:00"), Date.parse("2026-03-29T15:00:00Z"));
});

test("Ended and cancelled events never produce tasks; ongoing events do", () => {
  const fixtures = [event({ id: "ended", endTime: "11:00", startTime: "10:00" }), event({ id: "cancelled", cancelledAt: now.toISOString() }), event({ id: "ongoing", startTime: "11:30", endTime: "13:00" })];
  const tasks = preparationTasks(input(), fixtures, now);
  assert.ok(tasks.length > 0);
  assert.ok(tasks.every((task) => task.eventId === "ongoing"));
  assert.equal(eventHasEnded(event({ startTime: "23:00", endTime: "01:00" }), new Date("2026-09-10T22:30:00Z")), false);
});

test("Missing responses become actionable near the deadline, not immediately after invitation", () => {
  const fixtures = [event({ id: "soon" }), event({ id: "later", date: "2026-09-13" })];
  const tasks = preparationTasks(input(), fixtures, now);
  assert.deepEqual(tasks.filter((task) => task.kind === "responses").map((task) => task.eventId), ["soon"]);
  assert.equal(tasks[0].kind, "responses");
  assert.equal(preparationTasks(input({ settings: { ...initialSettings, attendanceEnabled: false } }), fixtures, now).some((task) => task.kind === "responses"), false);
});

test("Only absent locations and valid responsible coaches affect preparation", () => {
  const tasks = preparationTasks(input(), [event({ trainerIds: ["deleted-user"], location: "   " })], now);
  assert.ok(tasks.some((task) => task.kind === "coach"));
  assert.ok(tasks.some((task) => task.kind === "location"));
});

test("Empty squads are not ready; fully assigned drafts still need publication", () => {
  const competition = event({ type: "tournament", responses: { p1: "yes", p2: "yes", p3: "yes" } });
  const squads = [{ id: "team", eventId: competition.id, name: "Team 1", trainerId: "coach", playerIds: [] as string[] }];
  const data = input({ tournamentPlans: [{ eventId: competition.id, squads }] });
  assert.equal(preparationTasks(data, [competition], now).find((task) => task.kind === "squad")?.title, "Mannschaften einteilen");
  squads[0].playerIds = ["p1", "p2", "p3"];
  assert.equal(preparationTasks(data, [competition], now).find((task) => task.kind === "squad")?.title, "Mannschaften freigeben");
  data.tournamentPlans[0].publishedAt = now.toISOString();
  assert.equal(preparationTasks(data, [competition], now).length, 0);
  competition.responses.p2 = "no";
  assert.equal(preparationTasks(data, [competition], now).find((task) => task.kind === "squad")?.title, "Einteilung prüfen");
});

test("New confirmed players absent from published squads reopen preparation", () => {
  const data = input({ users: [...input().users, player("p4")], tournamentPlans: [{ eventId: "training", publishedAt: now.toISOString(), squads: [{ id: "team", eventId: "training", name: "Team 1", trainerId: "coach", playerIds: ["p1", "p2", "p3"] }] }] });
  const tasks = preparationTasks(data, [event({ type: "tournament", responses: { p1: "yes", p2: "yes", p3: "yes", p4: "yes" } })], now);
  assert.match(tasks.find((task) => task.kind === "squad")!.detail, /1 Zusagen noch ohne Mannschaft/);
});

test("Training titles preserve saved names and never invent a planned topic", () => {
  assert.equal(trainingTitle(event()), "F2 Training");
  assert.equal(trainingTitle(event(), { name: "", focus: ["Ballgefühl", "Dribbeln"] }), "Ballgefühl & Dribbeln");
  assert.equal(trainingTitle(event(), { name: "Meine Einheit", focus: ["Dribbeln"] }), "Meine Einheit");
});

test("Ideas explain actual upcoming competition and prioritize a saved focus", () => {
  const fixtures = [event({ type: "match", date: "2026-09-09", title: "Vergangen" }), event({ type: "tournament", date: "2026-09-12", title: "Spielfest" })];
  const idea = trainingIdea(event(), fixtures, true);
  assert.match(idea.reason, /Samstag.*Spielfest/);
  assert.equal(idea.planned, false);
  assert.equal(trainingIdea(event(), fixtures, true, { name: "Training", focus: ["Dribbeln"] }).title, "Dribbeln");
  assert.doesNotMatch(trainingIdea(event(), [fixtures[0]], true).reason, /Vergangen/);
});
