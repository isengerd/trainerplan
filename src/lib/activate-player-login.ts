import type { Prisma } from "@prisma/client";
import { ApiInputError } from "./api-security";
import { hasAccessManagement } from "./license";

/** Attach credentials to the existing player; never replace the player or family links. */
export async function activatePlayerLogin(tx: Prisma.TransactionClient, input: { playerId: string; clubId: string; teamId: string; email: string; firebaseUid: string }) {
  const club = await tx.club.findUniqueOrThrow({ where: { id: input.clubId } });
  if (!hasAccessManagement(club.licenseType, club.licenseExpiresAt)) throw new ApiInputError("Spielerzugänge benötigen EM Pro oder die Vereinslizenz.", 403);
  const membership = await tx.membership.findFirst({ where: { userId: input.playerId, clubId: input.clubId, teamId: input.teamId, status: "active", role: "player", team: { active: true } } });
  if (!membership) throw new ApiInputError("Das Spielerprofil ist nicht mehr in dieser Mannschaft.", 409);
  const updated = await tx.user.updateMany({ where: { id: input.playerId, managedProfile: true, loginEnabled: false, firebaseUid: null }, data: { email: input.email, firebaseUid: input.firebaseUid, managedProfile: false, loginEnabled: true } });
  if (updated.count !== 1) throw new ApiInputError("Für dieses Spielerprofil wurde bereits ein Zugang eingerichtet.", 409);
  return tx.user.findUniqueOrThrow({ where: { id: input.playerId } });
}
