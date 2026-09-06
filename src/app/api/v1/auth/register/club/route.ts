import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { defaultPosition } from "@/data/club";
import { createSession, firebaseAuthEnabled, requestUsesHttps, safeUser, SESSION_COOKIE } from "@/lib/auth";
import { ApiInputError, clientIp, emailValue, readJson, textValue } from "@/lib/api-security";
import { anonymousThrottleKey, persistentRateLimit } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/db";
import { uniqueClubSlug } from "@/lib/registration";
import { publicRegistrationEnabled } from "@/lib/registration-access";

type RegistrationBody = { name?: unknown; email?: unknown; password?: unknown; clubName?: unknown; teamName?: unknown; ageGroup?: unknown };

export async function POST(request: NextRequest) {
  if (firebaseAuthEnabled()) return NextResponse.json({ error: "Dieser Registrierungsweg wurde durch die sichere Firebase-Erstregistrierung ersetzt." }, { status: 410 });
  if (!publicRegistrationEnabled()) return NextResponse.json({ error: "Die öffentliche Registrierung ist derzeit geschlossen. Bitte nutze einen persönlichen Einladungslink." }, { status: 403 });
  const attempt = await persistentRateLimit(anonymousThrottleKey("register-club", clientIp(request)), 5, 60 * 60_000);
  if (!attempt.allowed) return NextResponse.json({ error: "Zu viele Registrierungsversuche. Bitte später erneut versuchen." }, { status: 429, headers: { "Retry-After": String(attempt.retryAfter) } });

  try {
    const body = await readJson<RegistrationBody>(request, 16_384);
    const name = textValue(body.name, "Name", 100, 2);
    const email = emailValue(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 256) throw new ApiInputError("Das Passwort benötigt 12 bis 256 Zeichen.");
    const clubName = textValue(body.clubName, "Vereinsname", 120, 2);
    const teamName = textValue(body.teamName, "Mannschaft", 120, 2);
    const ageGroup = typeof body.ageGroup === "string" && body.ageGroup.trim() ? textValue(body.ageGroup, "Altersklasse", 40, 2) : "F-Jugend";

    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "Für diese E-Mail-Adresse existiert bereits ein Zugang. Bitte melde dich an oder nutze einen Einladungslink." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      let club;
      for (let suffix = 0; suffix < 100; suffix += 1) {
        try {
          club = await tx.club.create({ data: { name: clubName, slug: uniqueClubSlug(clubName, suffix), licenseType: "single_team_free" } });
          break;
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        }
      }
      if (!club) throw new ApiInputError("Der Verein konnte nicht angelegt werden.", 409);
      const team = await tx.team.create({ data: { clubId: club.id, name: teamName, ageGroup } });
      const createdUser = await tx.user.create({ data: {
        id: `user-${randomUUID()}`,
        name,
        email,
        passwordHash,
        role: "admin",
        position: defaultPosition.admin,
        ageGroup,
        activeTeamId: team.id,
      } });
      await tx.membership.create({ data: { userId: createdUser.id, clubId: club.id, teamId: team.id, role: "admin", clubAdmin: true } });
      const defaultConfig = await tx.appConfig.findUnique({ where: { id: "default" } });
      if (defaultConfig) await tx.appConfig.create({ data: {
        id: `club-${club.id}`, clubId: club.id, teamId: team.id,
        settings: { ...(defaultConfig.settings as Record<string, unknown>), clubName, teamName: `${teamName} · ${ageGroup}` },
        plans: defaultConfig.plans as Prisma.InputJsonValue, templates: defaultConfig.templates as Prisma.InputJsonValue, planMeta: defaultConfig.planMeta as Prisma.InputJsonValue,
      } });
      return createdUser;
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ user: safeUser(user), club: { name: clubName, teamName }, token: session.token, expiresAt: session.expiresAt.toISOString() }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: requestUsesHttps(request), path: "/", expires: session.expiresAt });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Registrierung konnte nicht verarbeitet werden.";
    return NextResponse.json({ error: message }, { status: error instanceof ApiInputError ? error.status : 400 });
  }
}
