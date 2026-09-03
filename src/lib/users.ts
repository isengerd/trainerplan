import { Prisma } from "@prisma/client";
import type { ClubSettings, ClubUser } from "@/data/club";
import { prisma } from "./db";
import { ageGroupForBirthday } from "./age-groups";
import { ApiInputError } from "./api-security";
import { safeUser } from "./auth";
import { activeClubScope } from "./club-context";
import { validateUsers } from "./validators";

export async function getUsers(actor: Prisma.UserGetPayload<{}>) {
  const [allUsers, config, scope] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.appConfig.findUniqueOrThrow({ where: { id: "default" }, select: { settings: true } }),
    activeClubScope(actor),
  ]);
  const users = scope
    ? (await prisma.membership.findMany({ where: { clubId: scope.clubId, status: "active", ...(scope.teamId ? { teamId: scope.teamId } : {}) }, include: { user: true } })).map((membership) => ({ ...membership.user, role: membership.role, groupId: membership.groupId })).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))
    : allUsers;
  const settings = config.settings as unknown as Pick<ClubSettings, "teamFeatureEnabled">;
  const visibleUsers = actor.role === "player" && settings.teamFeatureEnabled === false ? users.filter((user) => user.id === actor.id) : users;
  return visibleUsers.map((member) => {
    const safe = safeUser(member);
    if (actor.role !== "player" || member.id === actor.id) return safe;
    return { ...safe, email: "", phone: "", birthday: "" };
  });
}

export async function saveUsers(value: unknown, actor: Prisma.UserGetPayload<{}>) {
  const allowed: ClubUser[] = validateUsers(value, actor.id, actor.role === "admin" || actor.role === "trainer");
  const scope = await activeClubScope(actor);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  const memberships = await prisma.membership.findMany({ where: { clubId: scope.clubId, teamId: scope.teamId, status: "active" }, include: { user: { select: { id: true } } } });
  const existingUsers = memberships.map((membership) => ({ id: membership.user.id, role: membership.role }));
  const existingIds = new Set(existingUsers.map((entry) => entry.id));
  const existingById = new Map(existingUsers.map((entry) => [entry.id, entry]));
  if (allowed.some((entry) => !existingIds.has(entry.id))) throw new ApiInputError("Ein Benutzerkonto existiert nicht.");
  if (actor.role === "admin") {
    const changedRoles = new Map(allowed.map((entry) => [entry.id, entry.role]));
    if ((changedRoles.get(actor.id) ?? actor.role) !== "admin") throw new ApiInputError("Du kannst dir die eigene Adminrolle nicht entziehen. Übertrage die Administration bei Bedarf zuerst an eine andere Person.");
    if (!existingUsers.some((entry) => (changedRoles.get(entry.id) ?? entry.role) === "admin")) throw new ApiInputError("Mindestens ein Admin muss erhalten bleiben.");
    const groupIds = [...new Set(allowed.map((entry) => entry.groupId).filter((id): id is string => Boolean(id)))];
    if (groupIds.length && await prisma.teamGroup.count({ where: { id: { in: groupIds }, clubId: scope.clubId } }) !== groupIds.length) throw new ApiInputError("Eine ausgewählte Gruppe existiert nicht.");
  }
  await prisma.$transaction(allowed.map((entry) => {
    const existing = existingById.get(entry.id)!;
    const canEditProfile = actor.role === "admin" || actor.id === entry.id;
    const canEditDevelopment = actor.role === "admin" || (actor.role === "trainer" && existing.role === "player");
    return prisma.user.update({ where: { id: entry.id }, data: {
      name: canEditProfile ? entry.name : undefined, email: undefined,
      role: actor.role === "admin" ? entry.role : undefined,
      position: canEditProfile ? entry.position : undefined, number: canEditProfile ? entry.number : undefined,
      ballNumber: canEditProfile ? entry.ballNumber : undefined, phone: canEditProfile ? entry.phone : undefined,
      birthday: canEditProfile ? (entry.birthday ? new Date(`${entry.birthday}T12:00:00Z`) : null) : undefined,
      ageGroup: actor.role === "admin" ? (entry.role === "player" ? ageGroupForBirthday(entry.birthday) ?? "" : entry.ageGroup) : undefined,
      avatar: canEditProfile ? entry.avatar : undefined,
      dribblingRating: canEditDevelopment && existing.role === "player" ? entry.dribblingRating : undefined,
      shootingRating: canEditDevelopment && existing.role === "player" ? entry.shootingRating : undefined,
      passingRating: canEditDevelopment && existing.role === "player" ? entry.passingRating : undefined,
      internalTeam: canEditDevelopment && existing.role === "player" ? entry.internalTeam || null : undefined,
    } });
  }));
  if (actor.role === "admin") {
    await prisma.$transaction(allowed.map((entry) => prisma.membership.updateMany({ where: { userId: entry.id, clubId: scope.clubId, teamId: scope.teamId, status: "active" }, data: { role: entry.role, groupId: entry.groupId || null } })));
  }
  return getUsers(actor);
}
