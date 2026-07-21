import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "trainerplan-mvp", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error", service: "trainerplan-mvp", database: "unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
