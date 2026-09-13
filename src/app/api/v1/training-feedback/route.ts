import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { activeClubScope } from "@/lib/club-context";
import { apiError, ApiInputError, readJson, objectValue, textValue, integerValue, enumValue } from "@/lib/api-security";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request, { checkRevoked: true });
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer dürfen Übungen bewerten." }, { status: 403 });
  try {
    const scope = await activeClubScope(user);
    const body = objectValue(await readJson(request, 8192));
    if (!scope?.teamId || body.teamId !== scope.teamId) throw new ApiInputError("Bitte öffne die zugehörige Mannschaft, um die Bewertung zu synchronisieren.", 403);
    const sessionId = textValue(body.sessionId, "Training", 100, 1);
    const exerciseId = textValue(body.exerciseId, "Übung", 160, 1);
    const date = textValue(body.date, "Datum", 10, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new ApiInputError("Ungültiges Datum.");
    const rating = integerValue(body.rating, "Bewertung", 1, 3);
    const reason = body.reason ? enumValue(body.reason, ["Zu schwer", "Zu viel Warten", "Aufbau aufwendig"] as const, "Grund") : null;
    await prisma.trainingFeedback.upsert({
      where: { userId_teamId_sessionId_exerciseId: { userId: user.id, teamId: scope.teamId, sessionId, exerciseId } },
      create: { userId: user.id, clubId: scope.clubId, teamId: scope.teamId, sessionId, exerciseId, date, rating, reason },
      update: { rating, reason },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
