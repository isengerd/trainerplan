import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser, safeUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  return user ? NextResponse.json({ user: safeUser(user) }) : NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
}
