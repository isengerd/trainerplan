import type { ClubEvent, ClubSettings, ClubUser, TournamentPlan, TrainingPlanMeta } from "@/data/club";
import type { Exercise } from "@/data/demo";
import { duplicateTournamentPlayers, validateTournamentSquad } from "./tournament-planning";

export type DashboardInput = {
  events: ClubEvent[];
  users: ClubUser[];
  plans: Record<string, Exercise[]>;
  planMeta: Record<string, TrainingPlanMeta>;
  tournamentPlans: TournamentPlan[];
  settings: ClubSettings;
};
export type PreparationTask = {
  id: string;
  eventId: string;
  date: string;
  title: string;
  detail: string;
  action: "plan" | "event" | "squads";
  label: string;
  kind: "plan" | "coach" | "location" | "squad" | "responses";
  due: number;
  urgent: boolean;
};

export function berlinDateKey(now: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Convert the club's Berlin wall time to an instant, also across DST changes.
export function eventTimestamp(date: string, time: string) {
  const wall = Date.parse(`${date}T${time || "00:00"}:00Z`);
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    const displayed = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
    instant += wall - displayed;
  }
  return instant;
}

export function eventHasEnded(event: ClubEvent, now: Date) {
  let end = eventTimestamp(event.date, event.endTime || event.startTime);
  if (event.endTime && event.endTime < event.startTime) end += 86_400_000;
  return end <= now.getTime();
}

export function getWeek(today: string) {
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), date };
  });
  const thursday = days[3].date;
  const week = Math.ceil((Math.floor((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86_400_000) + 1) / 7);
  return { days, start: days[0].key, end: days[6].key, number: week };
}

export function attendanceCounts(event: ClubEvent, users: ClubUser[]) {
  const players = users.filter((user) => user.role === "player");
  const counts = { yes: 0, no: 0, maybe: 0, unanswered: 0, total: players.length };
  for (const player of players) {
    const response = event.responses[player.id];
    if (response === "yes" || response === "no" || response === "maybe") counts[response]++;
    else counts.unanswered++;
  }
  return counts;
}

export function responseDeadline(event: ClubEvent, settings: ClubSettings) {
  const hours = event.type === "training" ? settings.trainingDeadlineHours : event.type === "tournament" ? settings.tournamentDeadlineHours : settings.eventDeadlineHours;
  return eventTimestamp(event.date, event.startTime) - hours * 3_600_000;
}

export function preparationTasks(input: DashboardInput, weekEvents: ClubEvent[], now: Date): PreparationTask[] {
  const tasks: PreparationTask[] = [];
  const coaches = new Set(input.users.filter((user) => user.role === "trainer" || user.role === "admin").map((user) => user.id));
  const playerAges = Object.fromEntries(input.users.filter((user) => user.role === "player").map((user) => [user.id, user.ageGroup]));
  for (const event of weekEvents) {
    if (event.cancelledAt || eventHasEnded(event, now)) continue;
    const start = eventTimestamp(event.date, event.startTime);
    const add = (kind: PreparationTask["kind"], title: string, detail: string, action: PreparationTask["action"], label: string, due = start) => {
      tasks.push({ id: `${kind}-${event.id}`, eventId: event.id, date: event.date, kind, title, detail, action, label, due, urgent: due <= now.getTime() + 24 * 3_600_000 });
    };
    if (event.type === "training" && !(input.plans[event.date]?.length)) add("plan", "Training zusammenstellen", event.title, "plan", "Planen");
    if (event.type !== "event" && !(event.trainerIds ?? []).some((id) => coaches.has(id))) add("coach", "Verantwortliche festlegen", event.title, "event", "Festlegen");
    if (!event.location.trim()) add("location", "Treffpunkt ergänzen", event.title, "event", "Ergänzen");
    if (event.type === "tournament") {
      const plan = input.tournamentPlans.find((item) => item.eventId === event.id);
      const squads = plan?.squads ?? [];
      const assigned = new Set(squads.flatMap((squad) => squad.playerIds));
      const unassigned = input.users.filter((user) => user.role === "player" && event.responses[user.id] === "yes" && !assigned.has(user.id)).length;
      const invalid = squads.some((squad) => {
        const validation = validateTournamentSquad(squad, playerAges, { minFYouth: input.settings.tournamentMinFYouth, maxTeamSize: input.settings.tournamentMaxTeamSize, trainerRequired: input.settings.tournamentTrainerRequired });
        return !squad.playerIds.length || !validation.minimumMet || validation.sizeExceeded || validation.trainerMissing || (Boolean(squad.trainerId) && !coaches.has(squad.trainerId!)) || squad.playerIds.some((id) => !(id in playerAges) || (input.settings.attendanceEnabled && event.responses[id] !== "yes"));
      });
      if (!assigned.size) add("squad", "Mannschaften einteilen", event.title, "squads", "Einteilen");
      else if (unassigned || invalid || duplicateTournamentPlayers(squads).size) add("squad", "Einteilung prüfen", unassigned ? `${unassigned} Zusagen noch ohne Mannschaft · ${event.title}` : event.title, "squads", "Prüfen");
      else if (!plan?.publishedAt) add("squad", "Mannschaften freigeben", `Einteilung als Entwurf · ${event.title}`, "squads", "Ansehen");
    }
    if (input.settings.attendanceEnabled) {
      const counts = attendanceCounts(event, input.users);
      const deadline = responseDeadline(event, input.settings);
      // Unanswered invitations are normal; only make them a task near their deadline.
      if (counts.unanswered + counts.maybe > 0 && deadline <= now.getTime() + 24 * 3_600_000) {
        const detail = [counts.unanswered ? `${counts.unanswered} ohne Antwort` : "", counts.maybe ? `${counts.maybe} unsicher` : ""].filter(Boolean).join(" · ");
        add("responses", "Rückmeldungen klären", `${detail} · ${event.title}`, "event", "Ansehen", deadline);
      }
    }
  }
  return tasks.sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
}

export function trainingTitle(event: ClubEvent, meta?: TrainingPlanMeta) {
  if (event.type !== "training") return event.title;
  return meta?.name.trim() || meta?.focus.filter(Boolean).slice(0, 2).join(" & ") || event.title;
}

export function trainingIdea(event: ClubEvent | undefined, events: ClubEvent[], young: boolean, meta?: TrainingPlanMeta) {
  const competition = event && events.find((item) => !item.cancelledAt && (item.type === "match" || item.type === "tournament") && `${item.date}T${item.startTime}` > `${event.date}T${event.startTime}`);
  const focus = meta?.focus.filter(Boolean).slice(0, 2).join(" & ");
  if (focus) return { title: focus, text: young ? "Greife deinen Schwerpunkt in kleinen Spielen auf. Kurze Erklärungen und wenig Wartezeit lassen allen Kindern Raum zum Ausprobieren." : "Verbinde deinen Schwerpunkt mit einer spielnahen Aufgabe und einer klaren Beobachtungsfrage.", reason: "Aus deinem Trainingsplan", planned: true };
  return {
    title: young ? competition ? "Mutig zum Tor" : "Ballgefühl & kleine Spiele" : competition ? "Ballgewinn & Zusammenspiel" : "Wahrnehmen & entscheiden",
    text: young ? competition ? "Kurze 1-gegen-1-Duelle und ein freies Spiel auf Minitore: viele eigene Aktionen, mutige Abschlüsse und wenig Wartezeit." : "Jedes Kind mit Ball starten lassen, dann in kleinen Teams auf Tore spielen. Halte die Regeln einfach und die Pausen kurz." : "Kleine Spielformen mit wechselnder Überzahl schaffen Passoptionen und Entscheidungen unter Gegnerdruck.",
    reason: competition ? `Am ${new Date(`${competition.date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" })} steht „${competition.title}“ an. Darauf kann diese Spielidee vorbereiten.` : young ? "Für Kinderteams: viele Ballaktionen und eigene Erfolgserlebnisse." : "Für Jugendteams: spielnahe Situationen und selbstständige Entscheidungen.",
    planned: false,
  };
}
