import { NextResponse } from "next/server";
import { getStore } from "@/lib/booking/store";

export const dynamic = "force-dynamic";

// Désinscription des rappels (lien présent dans chaque message).
export async function POST(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await getStore();
  const b = await store.getBookingByToken(token);
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const c = await store.getClient(b.clientId);
  if (c) await store.saveClient({ ...c, consentReminders: false });
  for (const n of await store.listNotifications({ bookingId: b.id, status: "pending" })) {
    if (n.type === "reminder_d1" || n.type === "reminder_h2" || n.type === "thanks") await store.saveNotification({ ...n, status: "skipped", error: "Rappels refusés" });
  }
  return NextResponse.json({ ok: true });
}
