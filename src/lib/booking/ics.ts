import { site } from "@/data/site";

const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Fichier .ics « ajouter à mon agenda ». */
export function buildIcs(b: { id: string; startsAt: string; endsAt: string; title: string; description?: string }): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ZST Beauty Center//Reservation//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@zst-beauty-center`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(b.startsAt)}`,
    `DTEND:${fmt(b.endsAt)}`,
    `SUMMARY:${esc(b.title)}`,
    `LOCATION:${esc([site.name, site.address ?? ""].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(b.description ?? "")}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Rendez-vous ZST", "TRIGGER:-PT2H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
