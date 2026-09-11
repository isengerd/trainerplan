import { randomUUID } from "node:crypto";
import type { ClubEvent } from "@/data/club";
import { ApiInputError } from "./api-security";

function occurrenceDate(startDate: string, frequency: NonNullable<ClubEvent["repeatFrequency"]>, index: number) {
  const start = new Date(`${startDate}T12:00:00Z`);
  const current = new Date(start);
  if (frequency === "daily") current.setUTCDate(current.getUTCDate() + index);
  if (frequency === "weekly") current.setUTCDate(current.getUTCDate() + 7 * index);
  if (frequency === "biweekly") current.setUTCDate(current.getUTCDate() + 14 * index);
  if (frequency === "monthly" || frequency === "yearly") {
    const originalDay = start.getUTCDate();
    const targetYear = start.getUTCFullYear() + (frequency === "yearly" ? index : 0);
    const targetMonth = start.getUTCMonth() + (frequency === "monthly" ? index : 0);
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 12)).getUTCDate();
    current.setUTCFullYear(targetYear, targetMonth, Math.min(originalDay, lastDay));
  }
  return current.toISOString().slice(0, 10);
}

export function expandEventOccurrences(event: ClubEvent) {
  const frequency = event.repeatFrequency ?? "none";
  if (frequency === "none") return [{ ...event, seriesId: undefined }];
  const seriesId = `series-${randomUUID()}`;
  const result: ClubEvent[] = [];
  let index = 0;
  let date = occurrenceDate(event.date, frequency, index);
  while (event.repeatUntil && date <= event.repeatUntil) {
    if (result.length >= 200) throw new ApiInputError("Eine Terminserie darf höchstens 200 Termine enthalten. Wähle bitte ein früheres Enddatum.");
    result.push({ ...event, seriesId, id: result.length === 0 ? event.id : `event-${randomUUID()}`, date, repeatFrequency: "none", repeatUntil: undefined });
    index += 1;
    date = occurrenceDate(event.date, frequency, index);
  }
  return result;
}

export type EventDeleteScope = "single" | "following";

export function eventDeletionWhere(event: { id: string; clubId: string | null; teamId: string | null; seriesId: string | null; date: Date }, scope: EventDeleteScope) {
  const tenant = { clubId: event.clubId, teamId: event.teamId };
  if (scope === "single") return { ...tenant, id: event.id };
  if (!event.seriesId) throw new ApiInputError("Dieser Termin gehört keiner gespeicherten Serie an.");
  return { ...tenant, seriesId: event.seriesId, date: { gte: event.date } };
}
