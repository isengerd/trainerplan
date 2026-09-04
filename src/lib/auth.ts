import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";
import { ageGroupForBirthday } from "./age-groups";
import { firebaseAdminAuth } from "./firebase-admin";

export const SESSION_COOKIE = "trainerplan_session";
const SESSION_DAYS = 30;
const FIREBASE_SESSION_DAYS = 5;

export function firebaseAuthEnabled() {
  return process.env.AUTH_PROVIDER === "firebase";
}

export type SafeUser = Omit<User, "passwordHash" | "firebaseUid" | "createdAt" | "updatedAt" | "birthday"> & { birthday: string; managedPlayerIds: string[] };

export function safeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    number: user.number,
    ballNumber: user.ballNumber,
    phone: user.phone,
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : "",
    ageGroup: user.role === "player" ? ageGroupForBirthday(user.birthday) ?? "" : user.ageGroup,
    avatar: user.avatar,
    groupId: user.groupId,
    dribblingRating: user.dribblingRating,
    shootingRating: user.shootingRating,
    passingRating: user.passingRating,
    internalTeam: user.internalTeam as "A" | "B" | null,
    activeTeamId: user.activeTeamId,
    managedProfile: user.managedProfile,
    loginEnabled: user.loginEnabled,
    managedPlayerIds: [],
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function requestUsesHttps(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return forwardedProtocol ? forwardedProtocol === "https" : request.nextUrl.protocol === "https:";
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.apiSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.apiSession.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export function requestToken(request: NextRequest) {
  if (firebaseAuthEnabled()) return request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

type AuthOptions = { checkRevoked?: boolean; maxAuthAgeSeconds?: number };

export async function createFirebaseSession(idToken: string) {
  const auth = firebaseAdminAuth();
  if (!auth) throw new Error("Firebase Authentication ist serverseitig nicht konfiguriert.");
  const decoded = await auth.verifyIdToken(idToken, true);
  const email = decoded.email?.trim().toLowerCase();
  if (!email) throw new Error("Das Firebase-Konto besitzt keine E-Mail-Adresse.");
  let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  if (!user) {
    const emailUser = await prisma.user.findUnique({ where: { email } });
    if (!emailUser || !emailUser.loginEnabled) throw new Error("Für dieses Konto ist noch kein NextSession-Zugang eingerichtet.");
    if (emailUser.firebaseUid && emailUser.firebaseUid !== decoded.uid) throw new Error("Diese E-Mail-Adresse ist bereits mit einem anderen Zugang verbunden.");
    const claimed = await prisma.user.updateMany({ where: { id: emailUser.id, firebaseUid: null }, data: { firebaseUid: decoded.uid } });
    user = claimed.count === 1 ? await prisma.user.findUnique({ where: { id: emailUser.id } }) : await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  }
  if (!user?.loginEnabled) throw new Error("Dieser Zugang wurde gesperrt.");
  const expiresIn = FIREBASE_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const cookie = await auth.createSessionCookie(idToken, { expiresIn });
  return { cookie, expiresAt: new Date(Date.now() + expiresIn), user };
}

export function sessionCookieSettings(request: NextRequest, expiresAt?: Date) {
  return { httpOnly: true, sameSite: "strict" as const, secure: requestUsesHttps(request), path: "/", ...(expiresAt ? { expires: expiresAt } : {}) };
}

export async function authenticatedUser(request: NextRequest, options: AuthOptions = {}) {
  const token = requestToken(request);
  if (!token) return null;
  if (firebaseAuthEnabled()) {
    const auth = firebaseAdminAuth();
    if (!auth) return null;
    try {
      const decoded = await auth.verifySessionCookie(token, Boolean(options.checkRevoked));
      if (options.maxAuthAgeSeconds && Date.now() / 1000 - decoded.auth_time > options.maxAuthAgeSeconds) return null;
      const firebaseUser = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (!firebaseUser?.loginEnabled) return null;
      const membership = await prisma.membership.findFirst({
        where: { userId: firebaseUser.id, status: "active", team: { active: true }, ...(firebaseUser.activeTeamId ? { teamId: firebaseUser.activeTeamId } : {}) },
        orderBy: { createdAt: "asc" },
      }) ?? await prisma.membership.findFirst({ where: { userId: firebaseUser.id, status: "active", team: { active: true } }, orderBy: { createdAt: "asc" } });
      return membership ? { ...firebaseUser, role: membership.role } : firebaseUser;
    } catch {
      return null;
    }
  }
  const session = await prisma.apiSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.apiSession.delete({ where: { id: session.id } });
    return null;
  }
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: "active", team: { active: true }, ...(session.user.activeTeamId ? { teamId: session.user.activeTeamId } : {}) },
    orderBy: { createdAt: "asc" },
  }) ?? await prisma.membership.findFirst({ where: { userId: session.user.id, status: "active", team: { active: true } }, orderBy: { createdAt: "asc" } });
  return membership ? { ...session.user, role: membership.role } : session.user;
}

export function sensitiveAuthenticatedUser(request: NextRequest) {
  return authenticatedUser(request, { checkRevoked: true, maxAuthAgeSeconds: 60 * 60 });
}

export async function revokeSession(request: NextRequest) {
  const token = requestToken(request);
  if (firebaseAuthEnabled()) {
    const auth = firebaseAdminAuth();
    if (token && auth) {
      try { const decoded = await auth.verifySessionCookie(token); await auth.revokeRefreshTokens(decoded.sub); }
      catch { /* Ein ungültiges Cookie wird unten trotzdem entfernt. */ }
    }
    return;
  }
  if (token) await prisma.apiSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeOtherSessions(request: NextRequest, userId: string) {
  if (firebaseAuthEnabled()) {
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { firebaseUid: true } });
    const auth = firebaseAdminAuth();
    if (account?.firebaseUid && auth) await auth.revokeRefreshTokens(account.firebaseUid);
    return;
  }
  const token = requestToken(request);
  await prisma.apiSession.deleteMany({ where: { userId, ...(token ? { tokenHash: { not: hashToken(token) } } : {}) } });
}

export function canManage(role: Role) {
  return role === "admin" || role === "trainer";
}
