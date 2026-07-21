import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "trainerplan_session";
const SESSION_DAYS = 30;

export type SafeUser = Omit<User, "passwordHash" | "createdAt" | "updatedAt" | "birthday"> & { birthday: string };

export function safeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    number: user.number,
    phone: user.phone,
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : "",
    avatar: user.avatar,
    groupId: user.groupId,
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
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function authenticatedUser(request: NextRequest) {
  const token = requestToken(request);
  if (!token) return null;
  const session = await prisma.apiSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.apiSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function revokeSession(request: NextRequest) {
  const token = requestToken(request);
  if (token) await prisma.apiSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function canManage(role: Role) {
  return role === "admin" || role === "trainer";
}
