import { membershipAllowsAccess } from "./membership-access";
import type { Role } from "@prisma/client";
import type { OrganizationContext } from "@/data/club";
import { prisma } from "./db";
import { activeClubScope } from "./club-context";
import { effectiveLicenseType, hasMultipleTeams } from "./license";

export async function organizationContext(userId: string): Promise<OrganizationContext | null> {
  const scope = await activeClubScope({ id: userId });
  if (!scope) return null;
  const memberships = (await prisma.membership.findMany({
    where: { userId, clubId: scope.clubId, status: "active" },
    include: { team: true, club: true },
    orderBy: { createdAt: "asc" },
  })).filter(membershipAllowsAccess);
  const first = memberships[0];
  if (!first) return null;
  const isClubAdmin = memberships.some((membership) => membership.clubAdmin);
  const scopedTeamIds = memberships.map((membership) => membership.teamId).filter((teamId): teamId is string => Boolean(teamId));
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
  const accessibleTeamIds = new Set(availableTeams.map((team) => team.id));
  const managedLinks = await prisma.guardianPlayer.findMany({
    where: { guardianId: userId },
    include: {
      player: {
        select: {
          id: true, name: true, avatar: true, ageGroup: true,
          memberships: {
            where: { clubId: scope.clubId, status: "active", teamId: { not: null } },
            include: { team: { select: { id: true, name: true, ageGroup: true } } },
          },
        },
      },
    },
  });
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
    managedPlayers: managedLinks.flatMap(({ player }) => player.memberships
      .filter((membership) => membership.team && accessibleTeamIds.has(membership.team.id))
      .map((membership) => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar ?? undefined,
        teamId: membership.team!.id,
        teamName: membership.team!.name,
        ageGroup: membership.team!.ageGroup || player.ageGroup,
      }))),
  };
}

export async function requireClubAdmin(userId: string) {
  const scope = await activeClubScope({ id: userId });
  if (!scope) return null;
  const membership = await prisma.membership.findFirst({ where: { userId, clubId: scope.clubId, status: "active", clubAdmin: true } });
  return membership ? { scope, membership } : null;
}
