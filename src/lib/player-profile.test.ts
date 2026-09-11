import assert from "node:assert/strict";
import test from "node:test";
import { ageInYears, playerAccessLabel, shouldSuggestPlayerLogin, visibleProfileEmail } from "./player-profile";
import { effectiveLicenseType, hasAccessManagement } from "./license";
import { initialSettings } from "../data/club";
import { validateSettings } from "./validators";
const today = new Date("2026-09-11T12:00:00Z");

test("Altersberechnung berücksichtigt den Geburtstag", () => {
  assert.equal(ageInYears("2010-09-12", today), 15);
  assert.equal(ageInYears("2010-09-11", today), 16);

});

test("ungültige und zukünftige Geburtsdaten ergeben kein Alter", () => {

  assert.equal(ageInYears("2026-02-30", today), null);
  assert.equal(ageInYears("2027-01-01", today), null);
});

test("technische Profil-Adressen bleiben unsichtbar, echte Adressen unverändert", () => {
  assert.equal(visibleProfileEmail("player-123@profiles.invalid"), "");
  assert.equal(visibleProfileEmail("player@legacy.invalid"), "");
  assert.equal(visibleProfileEmail("eltern@example.org"), "eltern@example.org");
});

test("Lizenzzugänge folgen dem Tarif auch nach Ablauf und erneutem Upgrade", () => {
  assert.equal(hasAccessManagement("single_team_pro"), true);
  assert.equal(hasAccessManagement("single_team_free"), false);
  assert.equal(effectiveLicenseType("club", "2000-01-01"), "single_team_free");
  assert.equal(hasAccessManagement("single_team_pro", "2000-01-01"), false);
  assert.equal(hasAccessManagement("single_team_pro", null), true);
  assert.equal(hasAccessManagement("single_team"), true);
});

test("bestehende Einstellungen ohne Altersklasse bleiben gültig", () => {
  assert.equal(validateSettings(initialSettings).teamAgeGroup, undefined);
  assert.equal(validateSettings({ ...initialSettings, teamAgeGroup: "F2" }).teamAgeGroup, "f2");
  assert.throws(() => validateSettings({ ...initialSettings, teamAgeGroup: "F-Jugend" }));
});

test("Zugänge zeigen tatsächliche Kombinationen statt altersabhängiger Profilnamen", () => {
  assert.equal(playerAccessLabel({ managedProfile: true }), "Noch kein Zugang");
  assert.equal(playerAccessLabel({ managedProfile: true, hasGuardianAccess: true }), "Elternzugang");
  assert.equal(playerAccessLabel({ managedProfile: false }), "Eigener Zugang");
  assert.equal(playerAccessLabel({ managedProfile: false, hasGuardianAccess: true }), "Eigener Zugang + Elternzugang");
  assert.equal(playerAccessLabel({ managedProfile: false, loginEnabled: false }), "Noch kein Zugang");
});

test("Einladung wird ab E2 oder zehn Jahren empfohlen ohne eine Altersgrenze zu erzwingen", () => {
  assert.equal(shouldSuggestPlayerLogin("2017-09-11", "e2", today), true);
  assert.equal(shouldSuggestPlayerLogin("2016-09-11", "f1", today), true);
  assert.equal(shouldSuggestPlayerLogin("2016-09-12", "f1", today), false);
  assert.equal(shouldSuggestPlayerLogin("", "b2", today), true);
  assert.equal(shouldSuggestPlayerLogin("", "g2", today), false);
});
