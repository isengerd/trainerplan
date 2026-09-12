import { isPlatformAdmin } from "./platform-admin";
import { canInviteRole, effectiveLicenseType } from "./license";

type AccessMembership = {
  userId?: string;
  teamId: string | null;
  role: string;
  status: string;
  team: { active: boolean } | null;
  club: { ownerUserId?: string | null; licenseType: string; licenseExpiresAt?: Date | string | null };
};

export function membershipAllowsAccess(membership: AccessMembership) {
  if (membership.status !== "active" || !membership.teamId || !membership.team?.active) return false;
  if (membership.userId && isPlatformAdmin(membership.userId)) return true;
  if (membership.role === "admin") return effectiveLicenseType(membership.club.licenseType, membership.club.licenseExpiresAt) !== "single_team_free" || Boolean(membership.userId && membership.club.ownerUserId === membership.userId);
  if (!["trainer", "guardian", "player"].includes(membership.role)) return false;
  if (!["single_team_free", "single_team_pro", "single_team", "club"].includes(membership.club.licenseType)) return false;
  if (membership.club.licenseExpiresAt && Number.isNaN(new Date(membership.club.licenseExpiresAt).getTime())) return false;
  return canInviteRole(membership.club.licenseType, membership.role, membership.club.licenseExpiresAt);
}

export function selectAccessibleMembership<T extends AccessMembership>(memberships: T[], activeTeamId?: string | null): T | null {
  const allowed = memberships.filter(membershipAllowsAccess);
  return allowed.find((membership) => membership.teamId === activeTeamId) ?? allowed[0] ?? null;
}
