import type { LicenseType } from "@/data/club";

export function normalizeLicenseType(value: string): LicenseType {
  if (value === "club") return "club";
  if (value === "single_team_free") return "single_team_free";
  // Legacy-Einzelmannschaften verlieren beim Rollout keine bisherigen Funktionen.
  return "single_team_pro";
}

export function effectiveLicenseType(value: string, expiresAt?: Date | string | null): LicenseType {
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return "single_team_free";
  return normalizeLicenseType(value);
}

export function hasAccessManagement(value: string, expiresAt?: Date | string | null) {
  return effectiveLicenseType(value, expiresAt) !== "single_team_free";
}

export function hasMultipleTeams(value: string, expiresAt?: Date | string | null) {
  return effectiveLicenseType(value, expiresAt) === "club";
}
