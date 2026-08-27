import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureApplicationData, eventFromDatabase } from "@/lib/server-data";
import { invitationDto } from "@/lib/invitations";
import { getUsers } from "@/lib/users";
import { smtpStatus } from "@/lib/smtp";
import { ensureClubConfig, scopedResourceWhere } from "@/lib/club-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const currentUser = await authenticatedUser(request);
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  await ensureApplicationData();
  const activeMembership = await prisma.membership.findFirst({ where: { userId: currentUser.id, status: "active" }, select: { id: true, clubId: true, teamId: true } });
  const scopedConfig = activeMembership ? await ensureClubConfig(activeMembership) : null;
  const [users, events, exercises, config, groups, ageGroups, invitations, tournamentSquads] = await Promise.all([
    getUsers(currentUser),
    prisma.clubEvent.findMany({ where: activeMembership ? { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } : { clubId: null }, include: { responses: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    prisma.exerciseRecord.findMany({ where: activeMembership ? { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } : { clubId: null }, orderBy: { createdAt: "asc" } }),
    Promise.resolve(scopedConfig ?? prisma.appConfig.findUnique({ where: { id: "default" } })),
    prisma.teamGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { sortOrder: "asc" } }),
    currentUser.role === "admin"
      ? prisma.invitation.findMany({ where: activeMembership?.clubId ? { clubId: activeMembership.clubId, ...(activeMembership.teamId ? { teamId: activeMembership.teamId } : {}) } : undefined, include: { invitedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    prisma.tournamentSquad.findMany({ where: activeMembership ? { event: { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } } : undefined, include: { players: { select: { playerId: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!config) return NextResponse.json({ error: "Die Konfiguration konnte nicht geladen werden." }, { status: 500 });
  const settings = config.settings as { teamFeatureEnabled?: boolean; showResponsesToPlayers?: boolean };
  const visibleUsers = currentUser.role === "player" && settings.teamFeatureEnabled === false
    ? users.filter((member) => member.id === currentUser.id)
    : users;
  return NextResponse.json({
    currentUser: safeUser(currentUser),
    setupRequired: !activeMembership,
    users: visibleUsers.map((member) => {
      if (currentUser.role !== "player" || member.id === currentUser.id) return member;
      return { ...member, email: "", phone: "", birthday: "" };
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
    ageGroups: ageGroups.map(({ id, name, ageRange, sortOrder }) => ({ id, name, ageRange, sortOrder })),
    invitations: invitations.map(invitationDto),
    smtp: currentUser.role === "admin" ? smtpStatus() : { configured: false },
    tournamentPlans: Object.entries(tournamentSquads.reduce<Record<string, typeof tournamentSquads>>((plans, squad) => {
      if (currentUser.role === "player" && !squad.players.some((assignment) => assignment.playerId === currentUser.id)) return plans;
      (plans[squad.eventId] ??= []).push(squad);
      return plans;
    }, {})).map(([eventId, squads]) => ({
      eventId,
      squads: squads.map((squad) => ({
        id: squad.id,
        eventId,
        name: squad.name,
        trainerId: squad.trainerId,
        playerIds: currentUser.role === "player" ? [] : squad.players.map((assignment) => assignment.playerId),
      })),
    })),
  });
}
