import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureApplicationData, eventFromDatabase } from "@/lib/server-data";
import { invitationDto } from "@/lib/invitations";
import { smtpStatus } from "@/lib/smtp";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const currentUser = await authenticatedUser(request);
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  await ensureApplicationData();
  const [users, events, exercises, config, groups, invitations] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.clubEvent.findMany({ include: { responses: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    prisma.exerciseRecord.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.appConfig.findUniqueOrThrow({ where: { id: "default" } }),
    prisma.teamGroup.findMany({ orderBy: { name: "asc" } }),
    currentUser.role === "admin"
      ? prisma.invitation.findMany({ include: { invitedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);
  return NextResponse.json({
    currentUser: safeUser(currentUser),
    users: users.map(safeUser),
    events: events.map(eventFromDatabase),
    exercises: exercises.map((exercise) => exercise.data),
    settings: config.settings,
    plans: config.plans,
    templates: config.templates,
    planMeta: config.planMeta,
    groups: groups.map(({ id, name, description, color }) => ({ id, name, description, color })),
    invitations: invitations.map(invitationDto),
    smtp: currentUser.role === "admin" ? smtpStatus() : { configured: false },
  });
}
