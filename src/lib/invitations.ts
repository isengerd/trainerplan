import { publicAppOrigin } from "./app-environment";
import { createHash, randomBytes } from "node:crypto";
import type { Invitation } from "@prisma/client";
import type { NextRequest } from "next/server";

export function createInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: invitationTokenHash(token) };
}

export function invitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function applicationUrl(request: NextRequest, environment: { APP_ENV?: string; NODE_ENV?: string; PUBLIC_APP_URL?: string } = process.env) {
  return publicAppOrigin(environment, request.nextUrl.origin);
}

export function invitationDto(invitation: Invitation & { invitedBy: { name: string } }) {
  return {
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    ageGroup: invitation.ageGroup,
    groupId: invitation.groupId,
    clubId: invitation.clubId,
    teamId: invitation.teamId,
    managedPlayerId: invitation.managedPlayerId,
    invitedBy: invitation.invitedBy.name,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}
