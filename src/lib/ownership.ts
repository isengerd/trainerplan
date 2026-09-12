import type { Invitation, Prisma } from "@prisma/client";
import { ApiInputError } from "./api-security";
import { canInviteRole } from "./license";
import { isPlatformAdmin } from "./platform-admin";

type InvitedAccess = Pick<Invitation, "role" | "ownershipTransfer" | "invitedById" | "email"> & {
  team: { active: boolean } | null;
  club: { ownerUserId: string | null; licenseType: string; licenseExpiresAt: Date | null } | null;
};
export function invitationAllowsAccess(invitation: InvitedAccess) {
  if (!invitation.club || !invitation.team?.active) return false;
  if (invitation.ownershipTransfer) return invitation.role === "admin" && Boolean(invitation.email) && invitation.club.ownerUserId === invitation.invitedById;
  return canInviteRole(invitation.club.licenseType, invitation.role, invitation.club.licenseExpiresAt);
}

// Called inside the invitation's serializable claim transaction. A failed handover
// rolls back both the token claim and all account/membership changes.
export async function transferOwnership(tx: Prisma.TransactionClient, invitation: Invitation, successorId: string) {
  if (!invitation.clubId || !invitation.teamId || !invitation.ownershipTransfer || invitation.role !== "admin" || successorId === invitation.invitedById) throw new ApiInputError("Ungültige Übergabe.", 409);
  const successor = await tx.user.findUniqueOrThrow({ where: { id: successorId } });
  if (!successor.loginEnabled || successor.managedProfile) throw new ApiInputError("Dieser Zugang kann die Inhaberschaft nicht übernehmen.", 403);
  const team = await tx.team.findFirst({ where: { id: invitation.teamId, clubId: invitation.clubId, active: true } });
  if (!team) throw new ApiInputError("Die Mannschaft ist nicht mehr aktiv.", 409);
  const changed = await tx.club.updateMany({ where: { id: invitation.clubId, ownerUserId: invitation.invitedById }, data: { ownerUserId: successorId } });
  if (changed.count !== 1) throw new ApiInputError("Die Inhaberschaft hat sich inzwischen geändert.", 409);
  // Preserve history and family links. In Free this former trainer is paused by
  // the license policy; Pro retains their trainer access, never ownership rights.
  await tx.membership.updateMany({ where: { clubId: invitation.clubId, userId: invitation.invitedById }, data: { clubAdmin: false } });
  if (!isPlatformAdmin(invitation.invitedById)) await tx.membership.updateMany({ where: { clubId: invitation.clubId, userId: invitation.invitedById, role: "admin" }, data: { role: "trainer" } });
  await tx.membership.upsert({
    where: { userId_clubId_teamId: { userId: successorId, clubId: invitation.clubId, teamId: invitation.teamId } },
    create: { userId: successorId, clubId: invitation.clubId, teamId: invitation.teamId, role: "admin", clubAdmin: true },
    update: { role: "admin", clubAdmin: true, status: "active" },
  });
  await tx.user.update({ where: { id: successorId }, data: { activeTeamId: invitation.teamId } });
  await tx.invitation.deleteMany({ where: { clubId: invitation.clubId, ownershipTransfer: true, acceptedAt: null } });
}
