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
  const settings = config.settings as { teamFeatureEnabled?: boolean; showResponsesToPlayers?: boolean };
  const visibleUsers = currentUser.role === "player" && settings.teamFeatureEnabled === false
    ? users.filter((member) => member.id === currentUser.id)
    : users;
  return NextResponse.json({
    currentUser: safeUser(currentUser),
    users: visibleUsers.map((member) => {
      const safe = safeUser(member);
      if (currentUser.role !== "player" || member.id === currentUser.id) return safe;
      return { ...safe, email: "", phone: "", birthday: "" };
    }),
    events: events.map((event) => {
      const mapped = eventFromDatabase(event);
      return currentUser.role === "player" && settings.showResponsesToPlayers === false
        ? { ...mapped, responses: mapped.responses[currentUser.id] ? { [currentUser.id]: mapped.responses[currentUser.id] } : {} }
        : mapped;
    }),
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
