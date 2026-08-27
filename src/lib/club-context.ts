import { Prisma, type User } from "@prisma/client";
import { prisma } from "./db";

export type ClubScope = { clubId: string; teamId: string | null };

export async function activeClubScope(user: Pick<User, "id">): Promise<ClubScope | null> {
  return prisma.membership.findFirst({ where: { userId: user.id, status: "active" }, orderBy: { createdAt: "asc" }, select: { clubId: true, teamId: true } });
}

export function scopedResourceWhere(scope: ClubScope) {
  return { clubId: scope.clubId, ...(scope.teamId ? { teamId: scope.teamId } : {}) };
}

export function clubConfigId(scope: ClubScope) {
  return `club-${scope.clubId}`;
}

export async function ensureClubConfig(scope: ClubScope) {
  const id = clubConfigId(scope);
  const existing = await prisma.appConfig.findUnique({ where: { id } });
  if (existing) return existing;
  const fallback = await prisma.appConfig.findUnique({ where: { id: "default" } });
  if (!fallback) return null;
  return prisma.appConfig.create({ data: {
    id, clubId: scope.clubId, teamId: scope.teamId,
    settings: fallback.settings as Prisma.InputJsonValue,
    plans: fallback.plans as Prisma.InputJsonValue,
    templates: fallback.templates as Prisma.InputJsonValue,
    planMeta: fallback.planMeta as Prisma.InputJsonValue,
  } });
}
