import { Prisma, type User } from "@prisma/client";
import { prisma } from "./db";

export type ClubScope = { clubId: string; teamId: string | null };

export async function activeClubScope(user: Pick<User, "id">): Promise<ClubScope | null> {
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { activeTeamId: true } });
  if (account?.activeTeamId) {
    const selected = await prisma.membership.findFirst({ where: { userId: user.id, teamId: account.activeTeamId, status: "active", team: { active: true } }, select: { clubId: true, teamId: true } });
    if (selected) return selected;
  }
  return prisma.membership.findFirst({ where: { userId: user.id, status: "active", team: { active: true } }, orderBy: { createdAt: "asc" }, select: { clubId: true, teamId: true } });
}

export async function activeMembership(userId: string) {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { activeTeamId: true } });
  return prisma.membership.findFirst({ where: { userId, status: "active", team: { active: true }, ...(account?.activeTeamId ? { teamId: account.activeTeamId } : {}) }, orderBy: { createdAt: "asc" } });
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
