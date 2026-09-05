import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { objectValue, readJson, textValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const body = objectValue(await readJson(request, 8_192), "Ungültige Push-Daten.");
    const token = textValue(body.token, "Push-Token", 4_096, 16);
    const platform = textValue(body.platform, "Plattform", 20, 2);
    if (!["ios", "android"].includes(platform)) return NextResponse.json({ error: "Unbekannte Plattform." }, { status: 400 });
    await prisma.devicePushToken.upsert({ where: { token }, create: { token, platform, userId: user.id }, update: { platform, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push-Token konnte nicht gespeichert werden." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const body = objectValue(await readJson(request, 8_192), "Ungültige Push-Daten.");
  const token = textValue(body.token, "Push-Token", 4_096, 16);
  await prisma.devicePushToken.deleteMany({ where: { token, userId: user.id } });
  return NextResponse.json({ ok: true });
}
