import assert from "node:assert/strict";
import test from "node:test";
import { ageGroupForBirthday, NEXT_AGE_GROUP, seasonStartYear } from "./age-groups";

const season2026 = new Date("2026-07-29T12:00:00+02:00");

test("berechnet die Spielklassen der Saison 2026/27 aus dem Jahrgang", () => {
  const expected: Record<number, string> = {
    2008: "A1", 2009: "A2", 2010: "B1", 2011: "B2", 2012: "C1", 2013: "C2",
    2014: "D1", 2015: "D2", 2016: "E1", 2017: "E2", 2018: "F1", 2019: "F2", 2020: "G1", 2021: "G2",
  };
  for (const [year, ageGroup] of Object.entries(expected)) assert.equal(ageGroupForBirthday(`${year}-01-01`, season2026), ageGroup);
});

test("G2 umfasst jüngere Jahrgänge und Saisonwechsel erfolgt am 1. Juli", () => {
  assert.equal(ageGroupForBirthday("2022-12-31", season2026), "G2");
  assert.equal(ageGroupForBirthday("2020-01-01", new Date("2027-06-30T12:00:00+02:00")), "G1");
  assert.equal(ageGroupForBirthday("2020-01-01", new Date("2027-07-01T12:00:00+02:00")), "F2");
  assert.equal(seasonStartYear(new Date("2027-06-30T12:00:00+02:00")), 2026);
  assert.equal(seasonStartYear(new Date("2027-07-01T12:00:00+02:00")), 2027);
});

test("nicht zuordenbare oder fehlende Geburtsdaten liefern keine Klasse", () => {
  assert.equal(ageGroupForBirthday(null, season2026), null);
  assert.equal(ageGroupForBirthday("2000-01-01", season2026), null);
});

test("Mannschaften wachsen in der definierten Reihenfolge weiter", () => {
  const sequence = ["g2", "g1", "f2", "f1", "e2", "e1", "d2", "d1", "c2", "c1", "b2", "b1", "a2", "a1"] as const;
  sequence.slice(0, -1).forEach((ageGroup, index) => assert.equal(NEXT_AGE_GROUP[ageGroup], sequence[index + 1]));
  assert.equal(NEXT_AGE_GROUP.a1, null);
});
