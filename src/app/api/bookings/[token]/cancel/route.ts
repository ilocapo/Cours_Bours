import { NextResponse } from "next/server";
import { getStore } from "@/lib/booking/store";
import { cancelBooking } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

export async function POST(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await getStore();
  const b = await store.getBookingByToken(token);
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (new Date(b.startsAt).getTime() < Date.now()) return NextResponse.json({ error: "Ce rendez-vous est passé." }, { status: 400 });
  await cancelBooking(b.id, "client");
  return NextResponse.json({ ok: true });
}
