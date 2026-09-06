import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { getExercises, saveExercise } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Die Übungsbibliothek ist nur für Trainer und Admins verfügbar." }, { status: 403 });
  return NextResponse.json({ exercises: await getExercises(user) });
}

export async function POST(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Übungen verwalten." }, { status: 403 });
  try {
    const exercise = await saveExercise(await readJson(request, 256_000), user);
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
