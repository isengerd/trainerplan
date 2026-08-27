import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { getTemplates, saveTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ templates: await getTemplates() });
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Nur Trainer und Admins dürfen Vorlagen verwalten." }, { status: 403 });
  try {
    return NextResponse.json({ template: await saveTemplate(await readJson(request, 2_000_000)) }, { status: 201 });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
