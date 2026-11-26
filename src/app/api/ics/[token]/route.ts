import { getStore } from "@/lib/booking/store";
import { buildIcs } from "@/lib/booking/ics";
import { toView } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await getStore();
  const b = await store.getBookingByToken(token);
  if (!b) return new Response("Introuvable", { status: 404 });
  const v = await toView(store, b);
  return new Response(buildIcs({ id: b.id, startsAt: b.startsAt, endsAt: b.endsAt, title: `${v.serviceName} · ZST Beauty Center` }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="rendez-vous-zst.ics"' },
  });
}
