import { Prisma, type User } from "@prisma/client";
import { prisma } from "./db";

import { ApiInputError } from "./api-security";
import { accountMembershipAccess } from "./account-access";

export type ClubScope = { clubId: string; teamId: string | null };

export async function activeClubScope(user: Pick<User, "id"> & Partial<Pick<User, "activeTeamId" | "role">>): Promise<ClubScope | null> {
  const membership = await activeMembership(user.id);
  // A license/role change during a request must not pair an old role with a
  // newly selected team's resources. The next request can resolve a new context.
  if (user.activeTeamId && user.role && (!membership || membership.teamId !== user.activeTeamId || membership.role !== user.role)) throw new ApiInputError("Dein Mannschaftszugriff hat sich geändert. Bitte lade die Ansicht erneut.", 409);
  return membership ? { clubId: membership.clubId, teamId: membership.teamId } : null;
}

export async function activeMembership(userId: string) {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, activeTeamId: true, loginEnabled: true, managedProfile: true } });
  if (!account?.loginEnabled || account.managedProfile) return null;
  return (await accountMembershipAccess(account)).membership;
}

export function scopedResourceWhere(scope: ClubScope) {
  return { clubId: scope.clubId, ...(scope.teamId ? { teamId: scope.teamId } : {}) };
}

export function clubConfigId(scope: ClubScope) {
  return scope.teamId ? `team-${scope.teamId}` : `club-${scope.clubId}`;
}

export async function ensureClubConfig(scope: ClubScope) {
  const id = clubConfigId(scope);
  const existing = await prisma.appConfig.findUnique({ where: { id } });
  if (existing) return existing;
  const legacy = scope.teamId ? await prisma.appConfig.findUnique({ where: { id: `club-${scope.clubId}` } }) : null;
  const fallback = legacy ?? await prisma.appConfig.findUnique({ where: { id: "default" } });
  if (!fallback) return null;
  return prisma.appConfig.create({ data: {
    id, clubId: scope.clubId, teamId: scope.teamId,
    settings: fallback.settings as Prisma.InputJsonValue,
    plans: fallback.plans as Prisma.InputJsonValue,
    templates: fallback.templates as Prisma.InputJsonValue,
    planMeta: fallback.planMeta as Prisma.InputJsonValue,
  } });
}
