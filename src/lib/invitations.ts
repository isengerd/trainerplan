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

export function applicationUrl(request: NextRequest, environment: { NODE_ENV?: string; PUBLIC_APP_URL?: string } = process.env) {
  // Public links always use the product domain, even when opened through Vercel
  // or when an older deployment still has a Vercel URL configured.
  if (environment.NODE_ENV === "production") return "https://nextsession.de";
  const configured = environment.PUBLIC_APP_URL?.trim();
  const url = new URL(configured || request.nextUrl.origin);
  if (!/^https?:$/.test(url.protocol)) throw new Error("PUBLIC_APP_URL muss eine gültige HTTPS-Adresse sein.");
  return url.toString().replace(/\/$/, "");
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
