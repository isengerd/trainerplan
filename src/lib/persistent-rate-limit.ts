import { createHash } from "node:crypto";
import { prisma } from "./db";

export function anonymousThrottleKey(scope: string, value: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET || process.env.SESSION_SECRET || process.env.FIREBASE_PRIVATE_KEY;
  if (!secret) throw new Error("AUTH_RATE_LIMIT_SECRET ist nicht konfiguriert.");
  const digest = createHash("sha256").update(`${secret}:${value}`).digest("hex");
  return `${scope}:${digest}`;
}

export async function persistentRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "AuthThrottle" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextReset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthThrottle"."resetAt" <= ${now} THEN 1 ELSE "AuthThrottle"."count" + 1 END,
      "resetAt" = CASE WHEN "AuthThrottle"."resetAt" <= ${now} THEN ${nextReset} ELSE "AuthThrottle"."resetAt" END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;
  const result = rows[0] ?? { count: limit + 1, resetAt: nextReset };
  return {
    allowed: result.count <= limit,
    retryAfter: Math.max(1, Math.ceil((new Date(result.resetAt).getTime() - now.getTime()) / 1000)),
  };
}
