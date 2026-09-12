import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { requireClubOwner } from "@/lib/organization";
import { ApiInputError, apiError, emailValue, readJson } from "@/lib/api-security";
import { applicationUrl, createInvitationToken } from "@/lib/invitations";

export async function GET(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const owner = await requireClubOwner(user.id);
  if (!owner) return NextResponse.json({ error: "Nur der Inhaber kann Übergaben verwalten." }, { status: 403 });
  const pending = await prisma.invitation.findFirst({ where: { clubId: owner.scope.clubId, ownershipTransfer: true, acceptedAt: null }, select: { email: true, expiresAt: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ pending }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const owner = await requireClubOwner(user.id);
    if (!owner?.scope.teamId) throw new ApiInputError("Nur der Inhaber kann eine Übergabe vorbereiten.", 403);
    const body = await readJson<{ email?: unknown; confirmed?: unknown }>(request, 8192);
    if (body.confirmed !== true) throw new ApiInputError("Bitte bestätige die Übergabe.");
    const email = emailValue(body.email);
    if (email === user.email.toLowerCase()) throw new ApiInputError("Du bist bereits Inhaber.");
    const target = await prisma.user.findUnique({ where: { email }, select: { loginEnabled: true, managedProfile: true } });
    if (target && (!target.loginEnabled || target.managedProfile)) throw new ApiInputError("Bitte nutze einen eigenständigen, aktiven Zugang.", 409);
    const { token, tokenHash } = createInvitationToken();
    await prisma.$transaction(async (tx) => {
      const locked = await tx.club.updateMany({ where: { id: owner.club.id, ownerUserId: user.id }, data: { ownerUserId: user.id } });
      if (locked.count !== 1) throw new ApiInputError("Die Inhaberschaft hat sich geändert.", 409);
      await tx.invitation.deleteMany({ where: { clubId: owner.club.id, ownershipTransfer: true, acceptedAt: null } });
      await tx.invitation.create({ data: { tokenHash, email, role: "admin", ownershipTransfer: true, clubId: owner.club.id, teamId: owner.scope.teamId, invitedById: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ link: `${applicationUrl(request)}/einladung?token=${encodeURIComponent(token)}` });
  } catch (error) { const result = apiError(error); return NextResponse.json({ error: result.message }, { status: result.status }); }
}

export async function DELETE(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const owner = await requireClubOwner(user.id);
  if (!owner) return NextResponse.json({ error: "Nur der Inhaber kann die Übergabe zurücknehmen." }, { status: 403 });
  await prisma.invitation.deleteMany({ where: { clubId: owner.club.id, invitedById: user.id, ownershipTransfer: true, acceptedAt: null } });
  return NextResponse.json({ ok: true });
}
