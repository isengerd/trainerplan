import type { AttendanceValue, Role } from "@prisma/client";
import type { ClubEvent, ClubSettings, ClubUser } from "@/data/club";
import type { Exercise } from "@/data/demo";
import { ApiInputError, assertJsonSize, emailValue, enumValue, integerValue, objectValue, optionalText, textValue } from "./api-security";

const roles = ["admin", "trainer", "player"] as const satisfies readonly Role[];
const attendance = ["yes", "no", "maybe"] as const satisfies readonly AttendanceValue[];
const eventTypes = ["training", "tournament", "event"] as const;
const phases = ["Ankommen", "Einstieg", "Hauptteil", "Abschlussspiel"] as const;
const ageRanges = ["U8", "U9", "U8/U9"] as const;
const intensities = ["Niedrig", "Mittel", "Hoch"] as const;
const materialIds = ["balls", "cones", "bibs", "miniGoals", "youthGoals", "poles", "rings"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function uniqueIds<T extends { id: string }>(items: T[], label: string): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new ApiInputError(`${label} enthalten doppelte IDs.`);
  return items;
}

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function stringList(value: unknown, field: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) throw new ApiInputError(`${field} ist ungültig.`);
  return value.map((entry) => textValue(entry, field, maxLength, 1));
}

export function validateUsers(value: unknown, actorId: string, isAdmin: boolean): ClubUser[] {
  if (!Array.isArray(value) || value.length > 500) throw new ApiInputError("Ungültige Benutzerdaten.");
  const users = value.filter((item) => isAdmin || objectValue(item).id === actorId).map((item) => {
    const input = objectValue(item);
    const avatar = optionalText(input.avatar, "Profilbild", 1_500_000);
    if (avatar && !/^data:image\/(png|jpeg|webp);base64,/i.test(avatar)) throw new ApiInputError("Das Profilbildformat ist ungültig.");
    const birthday = optionalText(input.birthday, "Geburtsdatum", 10);
    if (birthday && !validDate(birthday)) throw new ApiInputError("Das Geburtsdatum ist ungültig.");
    return {
      id: textValue(input.id, "Benutzer-ID", 100, 1),
      name: textValue(input.name, "Name", 100, 2),
      email: emailValue(input.email),
      role: enumValue(input.role, roles, "Rolle"),
      position: optionalText(input.position, "Position", 100),
      number: input.number === undefined || input.number === null ? undefined : integerValue(input.number, "Trikotnummer", 0, 999),
      phone: optionalText(input.phone, "Telefonnummer", 40),
      birthday,
      avatar: avatar || undefined,
      groupId: input.groupId === null || input.groupId === undefined || input.groupId === "" ? null : textValue(input.groupId, "Gruppe", 100, 1),
    };
  });
  return uniqueIds(users, "Benutzerdaten");
}

export function validateEvents(value: unknown): ClubEvent[] {
  if (!Array.isArray(value) || value.length > 1_000) throw new ApiInputError("Ungültige Termindaten.");
  assertJsonSize(value, 3_000_000);
  const events = value.map((item) => {
    const input = objectValue(item);
    const date = textValue(input.date, "Datum", 10, 10);
    const startTime = textValue(input.startTime, "Beginn", 5, 5);
    const endTime = textValue(input.endTime, "Ende", 5, 5);
    const meetingTime = textValue(input.meetingTime, "Treffen", 5, 5);
    if (!validDate(date) || !timePattern.test(startTime) || !timePattern.test(endTime) || !timePattern.test(meetingTime)) throw new ApiInputError("Datum oder Uhrzeit ist ungültig.");
    const responsesInput = objectValue(input.responses, "Teilnahmen sind ungültig.");
    const responses = Object.fromEntries(Object.entries(responsesInput).map(([id, response]) => [textValue(id, "Benutzer-ID", 100, 1), enumValue(response, attendance, "Teilnahme")])) as ClubEvent["responses"];
    let weather: ClubEvent["weather"];
    if (input.weather !== undefined && input.weather !== null) {
      const candidate = objectValue(input.weather, "Wetter ist ungültig.");
      weather = {
        condition: enumValue(candidate.condition, ["sunny", "partly-cloudy", "cloudy"] as const, "Wetterlage"),
        label: textValue(candidate.label, "Wettertext", 60, 1),
        temperature: integerValue(candidate.temperature, "Temperatur", -50, 60),
      };
    }
    return {
      id: textValue(input.id, "Termin-ID", 120, 1), type: enumValue(input.type, eventTypes, "Terminart"),
      title: textValue(input.title, "Titel", 160, 1), date, startTime, endTime, meetingTime,
      location: textValue(input.location, "Ort", 180, 1), address: optionalText(input.address, "Adresse", 300) || undefined,
      description: optionalText(input.description, "Beschreibung", 5_000), trainerNote: optionalText(input.trainerNote, "Trainernotiz", 5_000) || undefined,
      maxParticipants: integerValue(input.maxParticipants, "Teilnehmerzahl", 1, 1_000), responses,
      weather,
    };
  });
  return uniqueIds(events, "Termine");
}

export function validateExercises(value: unknown): Exercise[] {
  if (!Array.isArray(value) || value.length > 1_000) throw new ApiInputError("Ungültige Übungsdaten.");
  assertJsonSize(value, 8_000_000);
  const exercises = value.map((item) => {
    const input = objectValue(item);
    const youtubeUrl = optionalText(input.youtubeUrl, "YouTube-Link", 500);
    if (youtubeUrl) {
      let parsed: URL;
      try { parsed = new URL(youtubeUrl); } catch { throw new ApiInputError("Der YouTube-Link ist ungültig."); }
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (parsed.protocol !== "https:" || !["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) throw new ApiInputError("Es sind nur HTTPS-Links zu YouTube erlaubt.");
    }
    if (!Array.isArray(input.materials) || input.materials.length > materialIds.length) throw new ApiInputError("Material ist ungültig.");
    const materials = input.materials.map((material) => {
      const entry = objectValue(material, "Material ist ungültig.");
      return { id: enumValue(entry.id, materialIds, "Material"), count: integerValue(entry.count, "Materialmenge", 1, 999) };
    });
    if (new Set(materials.map((material) => material.id)).size !== materials.length) throw new ApiInputError("Material darf nicht doppelt vorkommen.");
    const accent = textValue(input.accent, "Akzentfarbe", 7, 7);
    if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new ApiInputError("Die Akzentfarbe ist ungültig.");
    return {
      id: textValue(input.id, "Übungs-ID", 160, 1),
      title: textValue(input.title, "Übungstitel", 200, 1),
      description: textValue(input.description, "Beschreibung", 5_000, 1),
      duration: integerValue(input.duration, "Dauer", 1, 300),
      players: textValue(input.players, "Spielerzahl", 50, 1),
      ageGroup: enumValue(input.ageGroup, ["F-Jugend"] as const, "Altersklasse"),
      ageRange: enumValue(input.ageRange, ageRanges, "Jahrgang"),
      category: enumValue(input.category, phases, "Phase"),
      accent,
      intensity: enumValue(input.intensity, intensities, "Intensität"),
      focus: stringList(input.focus, "Schwerpunkte", 12, 80),
      setup: textValue(input.setup, "Organisation", 8_000, 1),
      coaching: stringList(input.coaching, "Coachingpunkte", 20, 500),
      materials,
      fieldSize: textValue(input.fieldSize, "Feldgröße", 120, 1),
      variant: integerValue(input.variant, "Grafikvariante", 0, 10_000),
      youtubeUrl: youtubeUrl || undefined,
    } satisfies Exercise;
  });
  return uniqueIds(exercises, "Übungen");
}

export function validateSettings(value: unknown): ClubSettings {
  const input = objectValue(value, "Ungültige Einstellungen.");
  const boolean = (key: string) => { if (typeof input[key] !== "boolean") throw new ApiInputError(`${key} ist ungültig.`); return input[key] as boolean; };
  return {
    theme: enumValue(input.theme, ["dark", "light"] as const, "Farbdesign"),
    teamFeatureEnabled: boolean("teamFeatureEnabled"), attendanceEnabled: boolean("attendanceEnabled"), waitlistEnabled: boolean("waitlistEnabled"),
    showResponsesToPlayers: boolean("showResponsesToPlayers"), automaticReminders: boolean("automaticReminders"),
    trainingDeadlineHours: integerValue(input.trainingDeadlineHours, "Trainingsfrist", 0, 720),
    tournamentDeadlineHours: integerValue(input.tournamentDeadlineHours, "Turnierfrist", 0, 720),
    eventDeadlineHours: integerValue(input.eventDeadlineHours, "Ereignisfrist", 0, 720),
    defaultTrainingCapacity: integerValue(input.defaultTrainingCapacity, "Trainingsplätze", 1, 1_000),
    defaultTournamentCapacity: integerValue(input.defaultTournamentCapacity, "Turnierplätze", 1, 1_000),
    clubName: textValue(input.clubName, "Vereinsname", 120, 1), teamName: textValue(input.teamName, "Mannschaft", 120, 1),
  };
}

export function validatePlans(value: unknown) {
  const input = objectValue(value, "Ungültige Trainingspläne.");
  const plans = objectValue(input.plans, "Trainingspläne fehlen.");
  const planMeta = objectValue(input.planMeta, "Planinformationen fehlen.");
  if (Object.keys(plans).length > 1_000 || Object.keys(planMeta).length > 1_000) throw new ApiInputError("Zu viele Trainingspläne.");
  for (const [date, exercises] of Object.entries(plans)) {
    if (!validDate(date) || !Array.isArray(exercises) || exercises.length > 100) throw new ApiInputError("Ein Trainingsplan ist ungültig.");
    validateExercises(exercises);
  }
  assertJsonSize(input, 10_000_000);
  return { plans, planMeta };
}

export function validateTemplates(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) throw new ApiInputError("Ungültige Vorlagen.");
  assertJsonSize(value, 8_000_000);
  const ids = new Set<string>();
  for (const item of value) {
    const input = objectValue(item); textValue(input.name, "Vorlagenname", 160, 1);
    const id = textValue(input.id, "Vorlagen-ID", 160, 1);
    if (ids.has(id)) throw new ApiInputError("Vorlagen enthalten doppelte IDs.");
    ids.add(id);
    enumValue(input.kind, ["plan", "phase"] as const, "Vorlagenart"); validateExercises(input.exercises);
  }
  return value;
}
