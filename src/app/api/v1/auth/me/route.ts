import { accountMembershipAccess } from "@/lib/account-access";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  const access = user ? await accountMembershipAccess(user) : null;
  return user ? NextResponse.json({ user: safeUser(user), isOwner: access?.membership?.club.ownerUserId === user.id }, { headers: { "Cache-Control": "private, no-store" } }) : NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
}
