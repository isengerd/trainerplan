import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { smtpStatus, smtpTransport } from "@/lib/smtp";

async function admin(request: NextRequest) {
  const user = await authenticatedUser(request);
  return user?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await admin(request))) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  return NextResponse.json(smtpStatus());
}

export async function POST(request: NextRequest) {
  if (!(await admin(request))) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  try {
    await smtpTransport().verify();
    return NextResponse.json({ ok: true, message: "SMTP-Verbindung und Anmeldung waren erfolgreich." });
  } catch {
    return NextResponse.json({ error: "SMTP-Verbindung oder Anmeldung fehlgeschlagen. Bitte Serverkonfiguration prüfen." }, { status: 400 });
  }
}
