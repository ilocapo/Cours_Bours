import { NextResponse } from "next/server";
import { getStore } from "@/lib/booking/store";
import { slotsFor } from "@/lib/booking/availability";
import { hhmm } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

// GET /api/slots?serviceId=…&date=YYYY-MM-DD[&staffId=…] → créneaux libres.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const serviceId = u.searchParams.get("serviceId") ?? "";
  const date = u.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  const slots = await slotsFor(await getStore(), { serviceId, date, staffId: u.searchParams.get("staffId") });
  return NextResponse.json({ date, slots: slots.map((m) => ({ minutes: m, label: hhmm(m) })) });
}
