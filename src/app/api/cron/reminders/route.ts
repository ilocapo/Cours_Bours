import { NextResponse } from "next/server";
import { processDue } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

// Tâche planifiée (toutes les 15 min) : envoie les rappels dus. Protégée par CRON_SECRET.
// Appel : GET /api/cron/reminders avec l'en-tête « Authorization: Bearer <CRON_SECRET> » (Vercel Cron l'ajoute seul).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await processDue());
}
