import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

// POST /api/bookings : réservation depuis le site.
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }
  if (b.website) return NextResponse.json({ ok: true, token: "ignored" }); // champ piège pour les robots
  const r = await createBooking({
    serviceId: String(b.serviceId ?? ""), date: String(b.date ?? ""), minutes: Number(b.minutes),
    staffId: b.staffId ? String(b.staffId) : null, name: String(b.name ?? ""), phone: String(b.phone ?? ""),
    email: b.email ? String(b.email) : null, consentReminders: b.consentReminders === true, note: String(b.note ?? "").slice(0, 500),
    source: "site",
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true, token: r.booking.token });
}
