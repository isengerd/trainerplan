import type { Role } from "@prisma/client";
import type { OrganizationContext } from "@/data/club";
import { prisma } from "./db";
import { activeClubScope } from "./club-context";
import { effectiveLicenseType, hasMultipleTeams } from "./license";

export async function organizationContext(userId: string): Promise<OrganizationContext | null> {
  const scope = await activeClubScope({ id: userId });
  if (!scope) return null;
  const memberships = await prisma.membership.findMany({
    where: { userId, clubId: scope.clubId, status: "active" },
    include: { team: true, club: true },
    orderBy: { createdAt: "asc" },
  });
  const first = memberships[0];
  if (!first) return null;
  const isClubAdmin = memberships.some((membership) => membership.clubAdmin);
  const scopedTeamIds = memberships.map((membership) => membership.teamId).filter((teamId): teamId is string => Boolean(teamId && teamId === scope.teamId));
  const availableTeams = await prisma.team.findMany({
    where: {
      clubId: scope.clubId,
      active: true,
      ...(!isClubAdmin || !hasMultipleTeams(first.club.licenseType, first.club.licenseExpiresAt) ? { id: { in: scopedTeamIds } } : {}),
    },
    include: { _count: { select: { memberships: { where: { status: "active" } } } } },
    orderBy: { createdAt: "asc" },
  });
  const roleByTeam = new Map(memberships.map((membership) => [membership.teamId, membership.role]));
  return {
    clubId: scope.clubId,
    clubName: first.club.name,
    licenseType: effectiveLicenseType(first.club.licenseType, first.club.licenseExpiresAt),
    licenseExpiresAt: first.club.licenseExpiresAt?.toISOString() ?? null,
    activeTeamId: scope.teamId,
    isClubAdmin,
    teams: availableTeams.map((team) => ({
      id: team.id,
      name: team.name,
      ageGroup: team.ageGroup,
      role: (roleByTeam.get(team.id) ?? (isClubAdmin ? "admin" : "player")) as Role,
      memberCount: team._count.memberships,
    })),
  };
}

export async function requireClubAdmin(userId: string) {
  const scope = await activeClubScope({ id: userId });
  if (!scope) return null;
  const membership = await prisma.membership.findFirst({ where: { userId, clubId: scope.clubId, status: "active", clubAdmin: true } });
  return membership ? { scope, membership } : null;
}
