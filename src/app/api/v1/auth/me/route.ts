import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  return user ? NextResponse.json({ user: safeUser(user) }, { headers: { "Cache-Control": "private, no-store" } }) : NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
}
