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
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("PUBLIC_APP_URL muss für Einladungslinks im Produktivbetrieb gesetzt sein.");
  const url = new URL(configured || request.nextUrl.origin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!/^https?:$/.test(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !local)) throw new Error("PUBLIC_APP_URL muss eine gültige HTTPS-Adresse sein.");
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
    invitedBy: invitation.invitedBy.name,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}
