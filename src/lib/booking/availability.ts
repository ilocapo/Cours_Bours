import type { Store } from "./store";
import type { Booking } from "./types";
import type { OpeningHours } from "@/data/hours";
import type { Service } from "@/data/services";
import type { Staff } from "@/data/staff";
import { addDays, isoToLocal, localToIso, parseHHMM, todayLocal, weekdayOf } from "./time";

const overlaps = (aS: string, aE: string, bS: string, bE: string) => aS < bE && bS < aE;

/** Qui peut réaliser cette prestation : ses prestations assignées, sinon tout son univers. */
export function eligibleStaff(staff: Staff[], svc: Service): Staff[] {
  return staff.filter((s) => s.active && (s.serviceIds.length ? s.serviceIds.includes(svc.id) : s.categoryIds.length === 0 || s.categoryIds.includes(svc.categoryId)));
}

/** Cette personne travaille-t-elle tout le long du créneau ? Sans planning propre, elle suit les horaires du salon. */
export function staffWorks(st: Staff, hours: OpeningHours[], date: string, startMin: number, endMin: number): boolean {
  const wd = weekdayOf(date);
  let open: string | null | undefined; let close: string | null | undefined;
  if (st.schedule) { const sh = st.schedule[wd]; open = sh?.start; close = sh?.end; }
  else { const h = hours.find((x) => x.weekday === wd); open = h?.opens; close = h?.closes; }
  if (!open || !close) return false;
  return startMin >= parseHHMM(open) && endMin <= parseHHMM(close);
}

type Ctx = { svc: Service; staff: Staff[]; hours: OpeningHours[]; capacity: number; booked: Booking[] };

/** Créneau libre ? Retourne la personne disponible (ou null si on ne gère pas d'équipe) ; `false` si impossible. */
function freeAt(c: Ctx, date: string, startMin: number, wanted?: string | null): { staffId: string | null } | false {
  const s = localToIso(date, startMin);
  const e = localToIso(date, startMin + c.svc.durationMin);
  const clash = c.booked.filter((b) => overlaps(s, e, b.startsAt, b.endsAt));
  const team = c.staff.filter((x) => x.active);
  if (team.length === 0) return clash.length < c.capacity ? { staffId: null } : false;
  const elig = eligibleStaff(team, c.svc).filter((x) => staffWorks(x, c.hours, date, startMin, startMin + c.svc.durationMin));
  const busy = new Set(clash.map((b) => b.staffId).filter(Boolean) as string[]);
  const unassigned = clash.filter((b) => !b.staffId).length;
  if (wanted) return elig.some((x) => x.id === wanted) && !busy.has(wanted) ? { staffId: wanted } : false;
  const free = elig.filter((x) => !busy.has(x.id));
  return free.length > unassigned ? { staffId: free[0].id } : false;
}

async function context(store: Store, serviceId: string, date: string) {
  const [services, hours, settings, staff] = await Promise.all([store.listServices(), store.getHours(), store.getSettings(), store.listStaff()]);
  const svc = services.find((s) => s.id === serviceId && s.active);
  const booked = (await store.listBookings(localToIso(date, 0), localToIso(addDays(date, 1), 0))).filter((b) => b.status === "confirmed" || b.status === "done");
  return { svc, hours, settings, staff, booked };
}

/** Créneaux libres (minutes depuis minuit, heure du salon) pour un rituel un jour donné. */
export async function slotsFor(
  store: Store,
  q: { serviceId: string; date: string; staffId?: string | null },
  now = new Date(),
): Promise<number[]> {
  const { svc, hours, settings, staff, booked } = await context(store, q.serviceId, q.date);
  if (!svc) return [];
  const today = todayLocal(now);
  if (q.date < today || q.date > addDays(today, settings.maxDaysAhead)) return [];
  const h = hours.find((x) => x.weekday === weekdayOf(q.date));
  if (!h || !h.opens || !h.closes) return [];
  const open = parseHHMM(h.opens);
  const close = parseHHMM(h.closes);
  const earliest = now.getTime() + settings.leadTimeMin * 60_000;
  const c: Ctx = { svc, staff, hours, capacity: settings.capacity, booked };
  const out: number[] = [];
  for (let t = open; t + svc.durationMin <= close; t += settings.slotStepMin) {
    if (new Date(localToIso(q.date, t)).getTime() < earliest) continue;
    if (freeAt(c, q.date, t, q.staffId)) out.push(t);
  }
  return out;
}

/** Choisit la première personne libre et compétente pour ce créneau (null si aucune équipe n'est saisie ou personne de libre). */
export async function pickStaff(store: Store, serviceId: string, date: string, startMin: number): Promise<string | null> {
  const { svc, hours, settings, staff, booked } = await context(store, serviceId, date);
  if (!svc) return null;
  const r = freeAt({ svc, staff, hours, capacity: settings.capacity, booked }, date, startMin);
  return r ? r.staffId : null;
}

export { isoToLocal };
