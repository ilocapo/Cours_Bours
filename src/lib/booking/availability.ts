import type { Store } from "./store";
import type { Booking } from "./types";
import { addDays, isoToLocal, localToIso, parseHHMM, todayLocal, weekdayOf } from "./time";

const overlaps = (aS: string, aE: string, bS: string, bE: string) => aS < bE && bS < aE;

/** Créneaux libres (minutes depuis minuit, heure du salon) pour un rituel un jour donné. */
export async function slotsFor(
  store: Store,
  q: { serviceId: string; date: string; staffId?: string | null },
  now = new Date(),
): Promise<number[]> {
  const [services, hours, settings, staff] = await Promise.all([store.listServices(), store.getHours(), store.getSettings(), store.listStaff()]);
  const svc = services.find((s) => s.id === q.serviceId && s.active);
  if (!svc) return [];
  const today = todayLocal(now);
  if (q.date < today || q.date > addDays(today, settings.maxDaysAhead)) return [];
  const h = hours.find((x) => x.weekday === weekdayOf(q.date));
  if (!h || !h.opens || !h.closes) return [];
  const open = parseHHMM(h.opens);
  const close = parseHHMM(h.closes);

  const dayStart = localToIso(q.date, 0);
  const dayEnd = localToIso(addDays(q.date, 1), 0);
  const booked = (await store.listBookings(dayStart, dayEnd)).filter((b) => b.status === "confirmed" || b.status === "done");
  const activeStaff = staff.filter((s) => s.active);
  const capacity = activeStaff.length || settings.capacity;
  const earliest = now.getTime() + settings.leadTimeMin * 60_000;

  const out: number[] = [];
  for (let t = open; t + svc.durationMin <= close; t += settings.slotStepMin) {
    const s = localToIso(q.date, t);
    const e = localToIso(q.date, t + svc.durationMin);
    if (new Date(s).getTime() < earliest) continue;
    const clash = booked.filter((b: Booking) => overlaps(s, e, b.startsAt, b.endsAt));
    const ok = q.staffId ? !clash.some((b) => b.staffId === q.staffId) : clash.length < capacity;
    if (ok) out.push(t);
  }
  return out;
}

export { isoToLocal };
