import { isPlatformAdmin } from "./platform-admin";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { selectAccessibleMembership } from "./membership-access";

export const PAUSED_ACCESS_MESSAGE = "Für diesen Zugang ist derzeit keine Mannschaft freigeschaltet. Bitte prüfe die Mannschaftszuordnung. Trainerzugänge benötigen EM Pro oder eine Vereinslizenz.";

export async function accountMembershipAccess(user: Pick<User, "id" | "activeTeamId">) {
  const memberships = await prisma.membership.findMany({ where: { userId: user.id }, include: { club: true, team: true }, orderBy: { createdAt: "asc" } });
  return { membership: selectAccessibleMembership(memberships.map((membership) => isPlatformAdmin(user.id) ? { ...membership, role: "admin" as const } : membership), user.activeTeamId), hasMemberships: memberships.length > 0 };
}

export async function authorizedAccount(user: User): Promise<User | null> {
  if (!user.loginEnabled || user.managedProfile) return null;
  const { membership, hasMemberships } = await accountMembershipAccess(user);
  if (membership) return { ...user, role: membership.role, activeTeamId: membership.teamId };
  // Only a new admin may enter onboarding without any membership. A revoked or
  // unlicensed membership must never fall back to the global User.role.
  return isPlatformAdmin(user.id) ? { ...user, role: "admin", activeTeamId: null } : !hasMemberships && user.role === "admin" ? user : null;
}
