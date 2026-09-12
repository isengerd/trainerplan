import type { LicenseType } from "@/data/club";

export function normalizeLicenseType(value: string): LicenseType {
  if (value === "club") return "club";
  if (value === "single_team_free") return "single_team_free";
  // Legacy-Einzelmannschaften verlieren beim Rollout keine bisherigen Funktionen.
  return value === "single_team" || value === "single_team_pro" ? "single_team_pro" : "single_team_free";
}

export function effectiveLicenseType(value: string, expiresAt?: Date | string | null): LicenseType {
  if (expiresAt && (!Number.isFinite(new Date(expiresAt).getTime()) || new Date(expiresAt).getTime() <= Date.now())) return "single_team_free";
  return normalizeLicenseType(value);
}

export function hasAccessManagement(value: string, expiresAt?: Date | string | null) {
  return effectiveLicenseType(value, expiresAt) !== "single_team_free";
}

export function hasMultipleTeams(value: string, expiresAt?: Date | string | null) {
  return effectiveLicenseType(value, expiresAt) === "club";
}

/** Player and parent participation is a core feature in every known plan. */
export function canInviteRole(value: string, role: string, expiresAt?: Date | string | null) {
  if (!["single_team_free", "single_team_pro", "single_team", "club"].includes(value)) return false;
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return false;
  if (role === "player" || role === "guardian") return true;
  return (role === "admin" || role === "trainer") && hasAccessManagement(value, expiresAt);
}
