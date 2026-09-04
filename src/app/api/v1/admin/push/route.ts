import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pushStatus, sendPushToUsers } from "@/lib/push";
import { requireClubAdmin } from "@/lib/organization";

async function admin(request: NextRequest) {
  const user = await authenticatedUser(request);
  return user && await requireClubAdmin(user.id) ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await admin(request);
  if (!user) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  return NextResponse.json({ ...pushStatus(), devices: await prisma.devicePushToken.count({ where: { userId: user.id } }) });
}

export async function POST(request: NextRequest) {
  const user = await admin(request);
  if (!user) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const result = await sendPushToUsers({ userIds: [user.id], title: "NextSession Test", body: "Push-Benachrichtigungen funktionieren auf diesem Gerät." });
  if (!result.configured) return NextResponse.json({ error: "Firebase ist auf dem Server noch nicht konfiguriert." }, { status: 503 });
  if (!result.devices) return NextResponse.json({ error: "Für dein Konto ist noch kein Gerät registriert. Öffne die neueste App-Version und erlaube Mitteilungen." }, { status: 409 });
  if (!result.sent) return NextResponse.json({ error: "Firebase hat die Testnachricht nicht zugestellt. Prüfe APNs und die Firebase-App-Konfiguration." }, { status: 502 });
  return NextResponse.json({ ok: true, message: `Test-Push an ${result.sent} Gerät gesendet.` });
}
