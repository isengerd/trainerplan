import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { apiError, objectValue, readJson } from "@/lib/api-security";
import { getEvents, saveEvents } from "@/lib/events";
import { eventToDatabase } from "@/lib/server-data";
import { prisma } from "@/lib/db";
import { validateEvents } from "@/lib/validators";
import { activeClubScope, scopedResourceWhere } from "@/lib/club-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ events: await getEvents(user) });
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine erstellen." }, { status: 403 });

  try {
    const body = objectValue(await readJson(request, 256_000), "Ungültige Termindaten.");
    const [event] = validateEvents([{ ...body, id: `event-${randomUUID()}`, responses: {} }]);
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    await prisma.clubEvent.create({ data: { id: event.id, ...eventToDatabase(event), ...scopedResourceWhere(scope) } });
    return NextResponse.json({ event: (await getEvents(user)).find((item) => item.id === event.id) }, { status: 201 });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role) && user.role !== "player") return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  try {
    const body = await readJson<{ events?: unknown }>(request, 4_000_000);
    if (!Array.isArray(body.events)) throw new Error("Termine fehlen.");
    return NextResponse.json(await saveEvents(body.events, user));
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
