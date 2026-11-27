import type { Store } from "./store";
import type { Absence, Invoice, TimeEntry } from "./types";
import { addDays, isoToLocal, localToIso, parseHHMM } from "./time";
import { dayState } from "./staffday";

export type PayRow = {
  staffId: string; name: string;
  workedMin: number; plannedMin: number; daysWorked: number; lateCount: number;
  leaveDays: number; sickDays: number; otherDays: number;
  prestations: number; invoicedXof: number; openNow: boolean;
};

const monthEnd = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${y}-${String(mo).padStart(2, "0")}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`; };
export const monthsDays = (m: string): string[] => { const out: string[] = []; for (let d = `${m}-01`; d <= monthEnd(m); d = addDays(d, 1)) out.push(d); return out; };

/** Durée travaillée d'une pointée (minutes). Une pointée encore ouverte compte jusqu'à maintenant. */
export const entryMinutes = (t: TimeEntry, now = new Date()) => Math.max(0, Math.round(((t.outAt ? new Date(t.outAt) : now).getTime() - new Date(t.inAt).getTime()) / 60000));

export async function computePayroll(store: Store, month: string, now = new Date()): Promise<PayRow[]> {
  const days = monthsDays(month);
  const from = localToIso(days[0], 0), to = localToIso(addDays(days.at(-1)!, 1), 0);
  let absences: Absence[] = []; let entries: TimeEntry[] = [];
  try { absences = await store.listAbsences(); entries = await store.listTimeEntries(from, to); } catch { /* migration 0003 pas encore passée */ }
  const [staff, hours, settings, bookings, invoices] = await Promise.all([store.listStaff(), store.getHours(), store.getSettings(), store.listBookings(from, to), store.listInvoices()]);
  const inv: Invoice[] = invoices.filter((i) => i.status !== "void");
  return staff.filter((s) => s.active).map((s) => {
    const mine = entries.filter((e) => e.staffId === s.id);
    let planned = 0, leave = 0, sick = 0, other = 0, late = 0;
    for (const d of days) {
      const st = dayState(s, d, hours, absences, settings.closures ?? []);
      if (st.kind === "work") {
        planned += st.end - st.start;
        const first = mine.filter((e) => isoToLocal(e.inAt).date === d)[0];
        if (first && isoToLocal(first.inAt).minutes > st.start + 10) late++;
      } else if (st.kind === "absence") {
        const ab = absences.find((a) => a.staffId === s.id && a.status === "approuvee" && a.fromDate <= d && d <= a.toDate);
        if (ab?.kind === "maladie") sick++; else if (ab?.kind === "conge") leave++; else other++;
      }
    }
    const doneBookings = bookings.filter((b) => b.staffId === s.id && b.status === "done");
    const ids = new Set(doneBookings.map((b) => b.id));
    return {
      staffId: s.id, name: s.name, workedMin: mine.reduce((t, e) => t + entryMinutes(e, now), 0), plannedMin: planned,
      daysWorked: new Set(mine.map((e) => isoToLocal(e.inAt).date)).size, lateCount: late, leaveDays: leave, sickDays: sick, otherDays: other,
      prestations: doneBookings.length, invoicedXof: inv.filter((i) => i.bookingId && ids.has(i.bookingId)).reduce((t, i) => t + i.totalXof, 0),
      openNow: mine.some((e) => !e.outAt),
    };
  });
}

export const hm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
export { parseHHMM };
