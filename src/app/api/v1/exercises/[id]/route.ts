import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { deleteExercise, saveExercise } from "@/lib/exercises";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Übungen verwalten." }, { status: 403 });
  try {
    const { id } = await context.params;
    const scope = await prisma.membership.findFirst({ where: { userId: user.id, status: "active" }, select: { clubId: true, teamId: true } });
    if (!scope || !(await prisma.exerciseRecord.findFirst({ where: { id, clubId: scope.clubId, ...(scope.teamId ? { teamId: scope.teamId } : {}) }, select: { id: true } }))) return NextResponse.json({ error: "Die Übung wurde nicht gefunden." }, { status: 404 });
    const body = await readJson<Record<string, unknown>>(request, 256_000);
    const exercise = await saveExercise({ ...body, id }, user);
    return NextResponse.json({ exercise });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Übungen verwalten." }, { status: 403 });
  const { id } = await context.params;
  await deleteExercise(id, user);
  return NextResponse.json({ ok: true });
}
