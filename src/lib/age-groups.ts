const seasonStartMonth = 7;

const ageGroupByBirthYearDifference: Record<number, string> = {
  6: "G1",
  7: "F1",
  8: "F2",
  9: "E1",
  10: "E2",
  11: "D1",
  12: "D2",
  13: "C1",
  14: "C2",
  15: "B1",
  16: "B2",
  17: "A1",
  18: "A2",
};

/** Liefert das Startjahr der Saison, in der das Datum liegt (Saisonwechsel am 1. Juli). */
export function seasonStartYear(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric" }).formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return month >= seasonStartMonth ? year : year - 1;
}

/**
 * Berechnet die Spielklasse anhand des Jahrgangs.
 * G2 umfasst ausdrücklich den Jahrgang 2021 und alle jüngeren Jahrgänge
 * (für 2026/27 also alle Jahrgänge ab 2021).
 */
export function ageGroupForBirthday(birthday: string | Date | null | undefined, referenceDate = new Date()) {
  if (!birthday) return null;
  const value = birthday instanceof Date ? birthday : new Date(`${birthday}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) return null;

  const difference = seasonStartYear(referenceDate) - value.getUTCFullYear();
  if (difference <= 5) return "G2";
  return ageGroupByBirthYearDifference[difference] ?? null;
}
