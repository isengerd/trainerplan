import type { ClubEvent } from "@/data/club";
import type { ClubScope } from "./club-context";
import { prisma } from "./db";
import { sendPushToUsers } from "./push";
import { sendEventMail, smtpStatus } from "./smtp";

export async function notifyEventChange(input: { event: ClubEvent; scope: ClubScope; actor: { id: string; name: string }; action: "created" | "updated" | "deleted"; appUrl: string }) {
  const memberships = await prisma.membership.findMany({
    where: { clubId: input.scope.clubId, status: "active", ...(input.scope.teamId ? { teamId: input.scope.teamId } : {}), userId: { not: input.actor.id } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  const recipients = [...new Map(memberships.map(({ user }) => [user.id, user])).values()];
  const verb = input.action === "created" ? "Neu" : input.action === "updated" ? "Aktualisiert" : "Abgesagt";
  const push = sendPushToUsers({ userIds: recipients.map((user) => user.id), title: `${verb}: ${input.event.title}`, body: `${input.event.date} · ${input.event.startTime} Uhr · ${input.event.location}`, eventId: input.event.id }).catch(() => ({ sent: 0, configured: false }));
  const email = smtpStatus().configured
    ? Promise.allSettled(recipients.filter((user) => user.email).map((user) => sendEventMail({ to: user.email, name: user.name, actor: input.actor.name, action: input.action, event: input.event, link: `${input.appUrl}/app` })))
    : Promise.resolve([]);
  const [pushResult, emailResults] = await Promise.all([push, email]);
  return { push: pushResult.sent, email: emailResults.filter((result) => result.status === "fulfilled").length };
}
