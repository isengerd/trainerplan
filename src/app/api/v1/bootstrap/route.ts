import { NextRequest, NextResponse } from "next/server";
import { safeUser, sensitiveAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureApplicationData, eventFromDatabase } from "@/lib/server-data";
import { invitationDto } from "@/lib/invitations";
import { getUsers } from "@/lib/users";
import { smtpStatus } from "@/lib/smtp";
import { pushStatus } from "@/lib/push";
import { activeClubScope, ensureClubConfig, scopedResourceWhere } from "@/lib/club-context";
import { organizationContext } from "@/lib/organization";
import { tenantScopedResult } from "@/lib/auth-policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const currentUser = await sensitiveAuthenticatedUser(request);
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  await ensureApplicationData();
  const activeMembership = await activeClubScope(currentUser);
  const organization = await organizationContext(currentUser.id);
  const scopedConfig = activeMembership ? await ensureClubConfig(activeMembership) : null;
  const [users, events, exercises, config, groups, ageGroups, invitations, tournamentSquads] = await Promise.all([
    getUsers(currentUser),
    prisma.clubEvent.findMany({ where: activeMembership ? { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } : { clubId: null }, include: { responses: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    prisma.exerciseRecord.findMany({ where: activeMembership ? { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } : { clubId: null }, orderBy: { createdAt: "asc" } }),
    Promise.resolve(scopedConfig ?? prisma.appConfig.findUnique({ where: { id: "default" } })),
    prisma.teamGroup.findMany({ where: activeMembership ? { clubId: activeMembership.clubId } : { clubId: null }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ orderBy: { sortOrder: "asc" } }),
    currentUser.role === "admin"
      ? tenantScopedResult(Boolean(activeMembership), () => prisma.invitation.findMany({ where: { clubId: activeMembership!.clubId, ...(activeMembership!.teamId ? { teamId: activeMembership!.teamId } : {}) }, include: { invitedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } }))
      : Promise.resolve([]),
    activeMembership
      ? prisma.tournamentSquad.findMany({ where: { event: { OR: [scopedResourceWhere(activeMembership), { clubId: null }] } }, include: { players: { select: { playerId: true } } }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
  ]);
  if (!config) return NextResponse.json({ error: "Die Konfiguration konnte nicht geladen werden." }, { status: 500 });
  const settings = config.settings as { showResponsesToPlayers?: boolean };
  const managedPlayerIds = (await prisma.guardianPlayer.findMany({ where: { guardianId: currentUser.id }, select: { playerId: true } })).map((link) => link.playerId);
  const visibleUsers = currentUser.role === "player" && organization?.licenseType === "single_team_free"
    ? users.filter((member) => member.id === currentUser.id)
    : users;
  return NextResponse.json({
    currentUser: { ...safeUser(currentUser), managedPlayerIds },
    organization,
    setupRequired: !activeMembership,
    users: visibleUsers.map((member) => {
      if (currentUser.role !== "player" || member.id === currentUser.id) return member;
      return { ...member, email: "", phone: "", birthday: "" };
    }),
    events: events.map((event) => {
      const mapped = eventFromDatabase(event);
      return (currentUser.role === "player" || currentUser.role === "guardian") && settings.showResponsesToPlayers === false
        ? { ...mapped, responses: Object.fromEntries(Object.entries(mapped.responses).filter(([id]) => id === currentUser.id || managedPlayerIds.includes(id))) }
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
    smtp: organization?.isClubAdmin ? smtpStatus() : { configured: false },
    push: organization?.isClubAdmin ? { ...pushStatus(), devices: await prisma.devicePushToken.count({ where: { userId: currentUser.id } }) } : { configured: false, devices: 0 },
    tournamentPlans: Object.entries(tournamentSquads.reduce<Record<string, Array<(typeof tournamentSquads)[number]>>>((plans, squad) => {
      if (currentUser.role === "player" && !squad.players.some((assignment) => assignment.playerId === currentUser.id)) return plans;
      if (currentUser.role === "guardian" && !squad.players.some((assignment) => managedPlayerIds.includes(assignment.playerId))) return plans;
      (plans[squad.eventId] ??= []).push(squad);
      return plans;
    }, {})).map(([eventId, squads]) => ({
      eventId,
      squads: squads.map((squad) => ({
        id: squad.id,
        eventId,
        name: squad.name,
        trainerId: squad.trainerId,
        playerIds: currentUser.role === "player" ? [] : currentUser.role === "guardian" ? squad.players.map((assignment) => assignment.playerId).filter((id) => managedPlayerIds.includes(id)) : squad.players.map((assignment) => assignment.playerId),
      })),
    })),
  });
}
