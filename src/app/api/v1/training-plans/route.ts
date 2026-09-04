import { NextRequest, NextResponse } from "next/server";
import { canManage, sensitiveAuthenticatedUser } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { getTrainingPlans, saveTrainingPlans } from "@/lib/training-plans";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  return NextResponse.json(await getTrainingPlans(user));
}

export async function PUT(request: NextRequest) {
  const user = await sensitiveAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role)) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  try {
    const body = await readJson(request, 12_000_000);
    const data = await saveTrainingPlans(body, user);
    return NextResponse.json(data);
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
