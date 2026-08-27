import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, canManage } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api-security";
import { getUsers, saveUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ users: await getUsers(user) });
}

export async function PUT(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManage(user.role) && user.role !== "player") return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  try {
    const users = await saveUsers(await readJson(request, 4_000_000), user);
    return NextResponse.json({ users });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
