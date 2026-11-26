import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import type { BookingView } from "@/lib/booking/types";

export async function viewsBetween(fromIso: string, toIso: string): Promise<BookingView[]> {
  const store = await getStore();
  const list = await store.listBookings(fromIso, toIso);
  return Promise.all(list.map((b) => toView(store, b)));
}

export const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };
