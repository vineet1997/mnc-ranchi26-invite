import { event } from "@/lib/event";

export function GET() {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mukesh & Company//SPACES Conference//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `DTSTART:${event.calendarStart}`,
    `DTEND:${event.calendarEnd}`,
    "SUMMARY:SPACES Conference · Ranchi",
    `LOCATION:${event.venue}\, ${event.address}`,
    "DESCRIPTION:Mukesh & Company welcomes Jharkhand's retail community to the SPACES Conference. Discover. Connect. Grow together.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="spaces-conference-ranchi.ics"',
    },
  });
}
