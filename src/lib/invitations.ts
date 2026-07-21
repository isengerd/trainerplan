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

export function applicationUrl(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
  return process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || `${protocol}://${host}`;
}

export function invitationDto(invitation: Invitation & { invitedBy: { name: string } }) {
  return {
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    groupId: invitation.groupId,
    invitedBy: invitation.invitedBy.name,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}
