import { Prisma } from "@prisma/client";
import { initialEvents, initialSettings, type ClubEvent } from "@/data/club";
import { exercises, library } from "@/data/demo";
import { prisma } from "./db";

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export function berlinDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcGuess));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const berlinAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return new Date(utcGuess - (berlinAsUtc - utcGuess));
}

export async function ensureApplicationData() {
  if (await prisma.exerciseRecord.count() === 0) {
    await prisma.exerciseRecord.createMany({ data: library.map((exercise) => ({ id: exercise.id, data: json(exercise) })) });
  }

  if (await prisma.clubEvent.count() === 0) {
    for (const event of initialEvents) {
      await prisma.clubEvent.create({
        data: {
          id: event.id,
          type: event.type,
          title: event.title,
          date: new Date(`${event.date}T12:00:00Z`),
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          address: event.address,
          meetingTime: event.meetingTime,
          description: event.description,
          trainerNote: event.trainerNote,
          weather: event.weather ? json(event.weather) : Prisma.JsonNull,
          maxParticipants: event.maxParticipants,
          responses: { create: Object.entries(event.responses).map(([userId, value]) => ({ userId, value })) },
        },
      });
    }
  }

  const dateParts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => dateParts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      settings: json(initialSettings),
      plans: json({ [today]: exercises }),
      templates: json([]),
      planMeta: json({ [today]: { name: "Dribbeln, Tore, Spielen", focus: ["Ballgefühl", "Spielfreude"] } }),
    },
  });
}

type DatabaseEvent = Prisma.ClubEventGetPayload<{ include: { responses: true } }>;

export function eventFromDatabase(event: DatabaseEvent): ClubEvent {
  return {
    id: event.id,
    type: event.type as ClubEvent["type"],
    title: event.title,
    date: event.date.toISOString().slice(0, 10),
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    address: event.address ?? undefined,
    meetingTime: event.meetingTime,
    description: event.description,
    trainerNote: event.trainerNote ?? undefined,
    weather: event.weather as ClubEvent["weather"],
    maxParticipants: event.maxParticipants,
    responses: Object.fromEntries((event.responses ?? []).map((response) => [response.userId, response.value])) as ClubEvent["responses"],
  };
}

export function eventToDatabase(event: ClubEvent) {
  return {
    type: event.type,
    title: event.title,
    date: new Date(`${event.date}T12:00:00Z`),
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    address: event.address,
    meetingTime: event.meetingTime,
    description: event.description,
    trainerNote: event.trainerNote,
    weather: event.weather ? json(event.weather) : Prisma.JsonNull,
    maxParticipants: event.maxParticipants,
  };
}
