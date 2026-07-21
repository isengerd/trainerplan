import type { NextRequest } from "next/server";

export class ApiInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readJson<T>(request: NextRequest, maxBytes = 256_000): Promise<T> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiInputError("Die Anfrage ist zu groß.", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiInputError("Die Anfrage ist zu groß.", 413);
  try { return JSON.parse(text) as T; }
  catch { throw new ApiInputError("Ungültiges JSON."); }
}

export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 5_000) for (const [id, item] of buckets) if (item.resetAt <= now) buckets.delete(id);
  return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

export function objectValue(value: unknown, message = "Ungültige Daten."): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiInputError(message);
  return value as Record<string, unknown>;
}

export function textValue(value: unknown, field: string, max: number, min = 0) {
  if (typeof value !== "string") throw new ApiInputError(`${field} ist ungültig.`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new ApiInputError(`${field} muss zwischen ${min} und ${max} Zeichen lang sein.`);
  return text;
}

export function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return "";
  return textValue(value, field, max);
}

export function emailValue(value: unknown) {
  const email = textValue(value, "E-Mail-Adresse", 254, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiInputError("Die E-Mail-Adresse ist ungültig.");
  return email;
}

export function enumValue<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new ApiInputError(`${field} ist ungültig.`);
  return value as T;
}

export function integerValue(value: unknown, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new ApiInputError(`${field} ist ungültig.`);
  return value as number;
}

export function assertJsonSize(value: unknown, maxBytes: number) {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > maxBytes) throw new ApiInputError("Die Datenmenge ist zu groß.", 413);
}

export function apiError(error: unknown) {
  return error instanceof ApiInputError
    ? { message: error.message, status: error.status }
    : { message: "Die Anfrage konnte nicht verarbeitet werden.", status: 400 };
}
