import { NextRequest, NextResponse } from "next/server";
import { authenticatedUser } from "@/lib/auth";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function localDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function foldLine(line: string) {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const events = await getEvents(user);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NextSession Kids!//Mannschaftskalender//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NextSession Kids!",
    "X-WR-TIMEZONE:Europe/Berlin",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(event.id)}@trainerplan.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Berlin:${localDateTime(event.date, event.startTime)}`,
      `DTEND;TZID=Europe/Berlin:${localDateTime(event.date, event.endTime)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `LOCATION:${escapeIcs([event.location, event.address].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${escapeIcs(event.description || "Termin aus NextSession")}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.map(foldLine).join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nextsession-kalender.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
