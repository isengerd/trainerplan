import { appEnvironment } from "@/lib/app-environment";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "nextsession-kids", database: "connected", environment: appEnvironment(), revision: process.env.NEXT_PUBLIC_RELEASE_SHA, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error", service: "nextsession-kids", database: "unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
