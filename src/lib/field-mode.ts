import type { Exercise } from "@/data/demo";
import { validateExercises } from "./validators";

const PREFIX = "nextsession-field:";
const OWNER = `${PREFIX}owner`;
export type FieldRating = { rating: number; reason?: string; revision: string; synced?: boolean };
export type FieldSession = {
  version: 1; id: string; owner: string; teamId: string; teamName: string; date: string; title: string;
  exercises: Exercise[]; index: number; remaining: number; endAt: number | null;
  started: boolean; finished: boolean; players: number; updatedAt: number; offlineReady?: boolean;
  skipped: string[]; ratings: Record<string, FieldRating>;
};
export function remainingTime(session: Pick<FieldSession, "endAt" | "remaining">, now = Date.now()) {
  return session.endAt === null ? session.remaining : session.endAt - now;
}
export function pauseTimer(session: FieldSession, now = Date.now()): FieldSession {
  return { ...session, remaining: remainingTime(session, now), endAt: null };
}
export function clearFieldSessions() {
  for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key);
}
export function setFieldOwner(owner: string) {
  if (localStorage.getItem(OWNER) !== owner) clearFieldSessions();
  localStorage.setItem(OWNER, owner);
}
export function saveFieldSession(session: FieldSession) {
  if (localStorage.getItem(OWNER) !== session.owner) throw new Error("Der gespeicherte Zugang hat sich geändert.");
  localStorage.setItem(PREFIX + session.id, JSON.stringify({ ...session, updatedAt: Date.now() }));
}
export function readFieldSession(id: string): FieldSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(PREFIX + id) || "null") as FieldSession;
    if (!s || s.version !== 1 || s.id !== id || s.owner !== localStorage.getItem(OWNER) || !Number.isFinite(s.updatedAt) || Date.now() - s.updatedAt > 30 * 86400000) return null;
    if (typeof s.title !== "string" || typeof s.teamName !== "string" || typeof s.teamId !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !Array.isArray(s.skipped) || !s.ratings || typeof s.ratings !== "object" || !Number.isInteger(s.players) || s.players < 0 || s.players > 100) return null;
    const exercises = validateExercises(s.exercises);
    if (!exercises.length || exercises.length > 100 || !Number.isInteger(s.index) || s.index < 0 || s.index >= exercises.length || !Number.isFinite(s.remaining) || (s.endAt !== null && !Number.isFinite(s.endAt))) return null;
    return { ...s, exercises };
  } catch { return null; }
}
export function storedFieldSessions() {
  return Object.keys(localStorage).filter(key => key.startsWith(PREFIX) && key !== OWNER).map(key => readFieldSession(key.slice(PREFIX.length))).filter((s): s is FieldSession => Boolean(s));
}
export function createFieldSession(input: Pick<FieldSession, "owner" | "teamId" | "teamName" | "date" | "title" | "players"> & { exercises: Exercise[] }): FieldSession {
  const exercises = validateExercises(input.exercises).map(e => ({ ...e, trainerId: null, internalTeam: null }));
  if (!exercises.length || exercises.length > 100) throw new Error("Bitte plane zuerst 1 bis 100 Übungen.");
  return { ...input, exercises, version: 1, id: crypto.randomUUID(), index: 0, remaining: exercises[0].duration * 60000, endAt: null, started: false, finished: false, updatedAt: Date.now(), players: input.players, skipped: [], ratings: {} };
}
export async function prepareFieldOffline() {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.register("/platz-sw.js", { scope: "/platz" });
    const worker = registration.installing || registration.waiting || registration.active;
    if (!worker) return false;
    if (worker.state !== "activated") await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Offline-Speicherung dauert zu lange.")), 20000);
      const changed = () => {
        if (worker.state === "activated" || worker.state === "redundant") {
          clearTimeout(timeout); worker.removeEventListener("statechange", changed);
          if (worker.state === "activated") resolve(); else reject(new Error("Offline-Speicherung fehlgeschlagen."));
        }
      };
      worker.addEventListener("statechange", changed); changed();
    });
    return true;
  } catch { return false; }
}

// Never replay feedback under a different account or active team.
export async function syncFieldFeedback(session: FieldSession): Promise<Record<string, FieldRating>> {
  const response = await fetch("/api/v1/auth/me", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Zum Synchronisieren bitte erneut anmelden.");
  const { user } = await response.json();
  if (user.id !== session.owner || user.activeTeamId !== session.teamId || !["admin", "trainer"].includes(user.role)) throw new Error("Zum Synchronisieren die passende Mannschaft öffnen.");
  const synced: Record<string, FieldRating> = {};
  for (const [exerciseId, rating] of Object.entries(session.ratings)) {
    if (rating.synced) continue;
    const result = await fetch("/api/v1/training-feedback", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: session.teamId, date: session.date, sessionId: session.id, exerciseId, rating: rating.rating, reason: rating.reason }) });
    if (!result.ok) throw new Error("Bewertungen bleiben auf diesem Gerät. Synchronisierung später erneut versuchen.");
    synced[exerciseId] = { ...rating, synced: true };
  }
  return synced;
}

export async function syncSavedFieldFeedback(teamId: string) {
  for (const session of storedFieldSessions()) {
    if (session.teamId !== teamId || !Object.values(session.ratings).some(r => !r.synced)) continue;
    try {
      const synced = await syncFieldFeedback(session);
      const current = readFieldSession(session.id);
      if (!current) continue;
      for (const [id, rating] of Object.entries(synced)) if (current.ratings[id]?.revision === rating.revision) current.ratings[id] = rating;
      saveFieldSession(current);
    } catch { /* Retain the outbox for the next visit; field mode offers manual retry. */ }
  }
}
