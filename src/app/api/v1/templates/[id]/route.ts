import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { deleteTemplate, saveTemplate } from "@/lib/templates";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Vorlagen verwalten." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await readJson<Record<string, unknown>>(request, 2_000_000);
    return NextResponse.json({ template: await saveTemplate({ ...body, id }, user) });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Vorlagen verwalten." }, { status: 403 });
  const { id } = await context.params;
  await deleteTemplate(id, user);
  return NextResponse.json({ ok: true });
}
