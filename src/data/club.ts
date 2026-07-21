export type Role = "admin" | "trainer" | "player";
export type Attendance = "yes" | "no" | "maybe";
export type EventType = "training" | "tournament" | "event";

export type ClubUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  number?: number;
  phone: string;
  birthday: string;
  avatar?: string;
  groupId?: string | null;
};

export type TeamGroup = { id: string; name: string; description: string; color: string };
export type ClubInvitation = {
  id: string;
  email: string;
  name: string;
  role: Role;
  groupId?: string | null;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
};
export type SmtpStatus = { configured: boolean; host?: string; port?: number; secure?: boolean; from?: string };

export type ClubEvent = {
  id: string;
  type: EventType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address?: string;
  meetingTime: string;
  description: string;
  trainerNote?: string;
  weather?: { condition: "sunny" | "partly-cloudy" | "cloudy"; label: string; temperature: number };
  maxParticipants: number;
  responses: Record<string, Attendance>;
};

export type ClubSettings = {
  theme: "dark" | "light";
  teamFeatureEnabled: boolean;
  attendanceEnabled: boolean;
  waitlistEnabled: boolean;
  showResponsesToPlayers: boolean;
  automaticReminders: boolean;
  trainingDeadlineHours: number;
  tournamentDeadlineHours: number;
  eventDeadlineHours: number;
  defaultTrainingCapacity: number;
  defaultTournamentCapacity: number;
  clubName: string;
  teamName: string;
};

export const initialSettings: ClubSettings = {
  theme: "light",
  teamFeatureEnabled: true,
  attendanceEnabled: true,
  waitlistEnabled: true,
  showResponsesToPlayers: true,
  automaticReminders: true,
  trainingDeadlineHours: 4,
  tournamentDeadlineHours: 24,
  eventDeadlineHours: 12,
  defaultTrainingCapacity: 14,
  defaultTournamentCapacity: 10,
  clubName: "FC Kicker",
  teamName: "F1 · F-Jugend",
};

export const roleLabels: Record<Role, string> = { admin: "Admin", trainer: "Trainer", player: "Spieler" };
export const eventLabels: Record<EventType, string> = { training: "Training", tournament: "Turnier", event: "Ereignis" };

export const initialEvents: ClubEvent[] = [
  { id: "event-1", type: "training", title: "Dribbeln, Tore, Spielen", date: "2026-07-16", startTime: "17:00", endTime: "18:15", meetingTime: "16:50", location: "Sportplatz Nord", address: "Sportplatz Nord, Musterstraße 12, 10115 Berlin", description: "F‑Jugend-Training mit kleinen Spielformen.", trainerNote: "Bitte zehn Minuten vor dem Treffen umgezogen am Platz sein. Trinkflasche und Schienbeinschoner nicht vergessen.", weather: { condition: "sunny", label: "Sonnig", temperature: 23 }, maxParticipants: 14, responses: { "player-1": "yes", "player-2": "yes", "player-3": "maybe", "player-4": "yes", "player-5": "no", "player-6": "yes" } },
  { id: "event-2", type: "training", title: "Torschuss & 1 gegen 1", date: "2026-07-18", startTime: "10:00", endTime: "11:15", meetingTime: "09:50", location: "Sportplatz Nord", address: "Sportplatz Nord, Musterstraße 12, 10115 Berlin", description: "Techniktraining mit vielen Abschlüssen.", trainerNote: "Torhüter dürfen gerne ihre Handschuhe mitbringen.", weather: { condition: "partly-cloudy", label: "Leicht bewölkt", temperature: 21 }, maxParticipants: 14, responses: { "player-1": "yes", "player-2": "maybe", "player-3": "yes" } },
  { id: "event-3", type: "tournament", title: "Kinderfußball-Festival", date: "2026-07-19", startTime: "10:00", endTime: "13:00", meetingTime: "09:15", location: "SV Grün-Weiß", address: "Sportanlage SV Grün-Weiß, Waldweg 8, 10117 Berlin", description: "Festival im 3 gegen 3. Bitte Trikots und Trinkflasche mitbringen.", trainerNote: "Wir treffen uns geschlossen am Haupteingang. Fahrgemeinschaften bitte frühzeitig im Team abstimmen.", weather: { condition: "sunny", label: "Sonnig", temperature: 24 }, maxParticipants: 10, responses: { "player-1": "yes", "player-2": "yes", "player-3": "yes", "player-4": "yes", "player-5": "no", "player-6": "yes", "player-7": "maybe" } },
  { id: "event-4", type: "event", title: "Team-Sommerfest", date: "2026-07-25", startTime: "15:00", endTime: "19:00", meetingTime: "15:00", location: "Vereinsheim", address: "Vereinsheim FC Kicker, Vereinsweg 4, 10115 Berlin", description: "Sommerfest für Kinder und Familien.", trainerNote: "Kuchen- und Salatspenden können in der Mannschaftsgruppe abgestimmt werden.", weather: { condition: "partly-cloudy", label: "Sonne & Wolken", temperature: 25 }, maxParticipants: 40, responses: {} },
];
