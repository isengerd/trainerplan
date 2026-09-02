import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { apiError, objectValue, readJson } from "@/lib/api-security";
import { getEvents } from "@/lib/events";
import { prisma } from "@/lib/db";
import { eventToDatabase } from "@/lib/server-data";
import { validateEvents } from "@/lib/validators";
import { activeClubScope, scopedResourceWhere } from "@/lib/club-context";
import { notifyEventChange } from "@/lib/event-notifications";
import { applicationUrl } from "@/lib/invitations";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine ändern." }, { status: 403 });

  try {
    const { id } = await context.params;
    const body = objectValue(await readJson(request, 256_000), "Ungültige Termindaten.");
    const [event] = validateEvents([{ ...body, id, responses: {} }]);
    const scope = await activeClubScope(user);
    if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
    const updated = await prisma.clubEvent.updateMany({ where: { id, ...scopedResourceWhere(scope) }, data: eventToDatabase(event) });
    if (updated.count !== 1) return NextResponse.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    const savedEvent = (await getEvents(user)).find((item) => item.id === id);
    const notifications = savedEvent ? await notifyEventChange({ event: savedEvent, scope, actor: user, action: "updated", appUrl: applicationUrl(request) }).catch(() => ({ email: 0, push: 0 })) : { email: 0, push: 0 };
    return NextResponse.json({ event: savedEvent, notifications });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Termine löschen." }, { status: 403 });

  const { id } = await context.params;
  const scope = await activeClubScope(user);
  if (!scope) return NextResponse.json({ error: "Der Vereinskontext ist noch nicht eingerichtet." }, { status: 409 });
  const event = (await getEvents(user)).find((item) => item.id === id);
  const deleted = await prisma.clubEvent.deleteMany({ where: { id, ...scopedResourceWhere(scope) } });
  if (deleted.count !== 1) return NextResponse.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
  const notifications = event ? await notifyEventChange({ event, scope, actor: user, action: "deleted", appUrl: applicationUrl(request) }).catch(() => ({ email: 0, push: 0 })) : { email: 0, push: 0 };
  return NextResponse.json({ ok: true, notifications });
}
