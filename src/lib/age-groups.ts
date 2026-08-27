const seasonStartMonth = 7;

const ageGroupByBirthYear2026: Record<number, FirstTeamAgeGroup> = {
  2008: "a1", 2009: "a2", 2010: "b1", 2011: "b2", 2012: "c1", 2013: "c2", 2014: "d1", 2015: "d2",
  2016: "e1", 2017: "e2", 2018: "f1", 2019: "f2", 2020: "g1", 2021: "g2",
};

export function seasonStartYear(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric" }).formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return month >= seasonStartMonth ? year : year - 1;
}

export function ageGroupForBirthday(birthday: string | Date | null | undefined, referenceDate = new Date()) {
  if (!birthday) return null;
  const value = birthday instanceof Date ? birthday : new Date(`${birthday}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) return null;
  const birthYear = value.getUTCFullYear();
  const base = ageGroupByBirthYear2026[birthYear] ?? (birthYear >= 2022 ? "g2" : null);
  if (!base) return null;
  let ageGroup: FirstTeamAgeGroup = base;
  for (let year = 2026; year < seasonStartYear(referenceDate); year += 1) {
    const next = NEXT_AGE_GROUP[ageGroup];
    if (!next) return null;
    ageGroup = next;
  }
  return ageGroup.toUpperCase();
}

export const FIRST_TEAM_AGE_GROUPS = [
  "g2", "g1", "f2", "f1", "e2", "e1", "d2", "d1",
  "c2", "c1", "b2", "b1", "a2", "a1",
] as const;

export type FirstTeamAgeGroup = (typeof FIRST_TEAM_AGE_GROUPS)[number];

export const NEXT_AGE_GROUP: Record<FirstTeamAgeGroup, FirstTeamAgeGroup | null> = {
  g2: "g1", g1: "f2", f2: "f1", f1: "e2", e2: "e1", e1: "d2",
  d2: "d1", d1: "c2", c2: "c1", c1: "b2", b2: "b1", b1: "a2",
  a2: "a1", a1: null,
};

export function isFirstTeamAgeGroup(value: string): value is FirstTeamAgeGroup {
  return (FIRST_TEAM_AGE_GROUPS as readonly string[]).includes(value);
}
