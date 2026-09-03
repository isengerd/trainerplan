import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizationContext, requireClubAdmin } from "@/lib/organization";

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const admin = await requireClubAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Nur Vereinsadmins dürfen den Vereinsmodus aktivieren." }, { status: 403 });
  await prisma.club.update({ where: { id: admin.scope.clubId }, data: { licenseType: "club" } });
  return NextResponse.json({ organization: await organizationContext(user.id) });
}
