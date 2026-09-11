import { NextRequest, NextResponse } from "next/server";
import { sensitiveAuthenticatedUser } from "@/lib/auth";
import { activeClubScope } from "@/lib/club-context";
import { ApiInputError, apiError } from "@/lib/api-security";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await sensitiveAuthenticatedUser(request);
  if (!actor || actor.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen Spieler entfernen." }, { status: actor ? 403 : 401 });
  try {
    const scope = await activeClubScope(actor);
    if (!scope?.teamId) throw new ApiInputError("Keine aktive Mannschaft ausgewählt.", 409);
    const { id } = await context.params;
    if (id === actor.id) throw new ApiInputError("Du kannst dich hier nicht selbst entfernen.");
    const today = new Date(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()) + "T00:00:00Z");
    await prisma.$transaction(async (tx) => {
      const removed = await tx.membership.updateMany({ where: { userId: id, clubId: scope.clubId, teamId: scope.teamId, role: "player", status: "active" }, data: { status: "suspended" } });
      if (removed.count !== 1) throw new ApiInputError("Das Spielerprofil wurde nicht gefunden.", 404);
      const futureEvents = { clubId: scope.clubId, teamId: scope.teamId, date: { gte: today } };
      await tx.attendanceResponse.deleteMany({ where: { userId: id, event: futureEvents } });
      await tx.tournamentSquadPlayer.deleteMany({ where: { playerId: id, event: futureEvents } });
      await tx.invitation.deleteMany({ where: { managedPlayerId: id, clubId: scope.clubId, teamId: scope.teamId, acceptedAt: null } });
      // Keep the user, historical data and GuardianPlayer links. Removing a
      // roster membership must not delete parents or another team's profile.
    });
    return NextResponse.json({ removed: true });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
