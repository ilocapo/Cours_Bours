import type { Metadata } from "next";
import PunchPad, { type PunchPerson } from "@/components/admin/PunchPad";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { addDays, hhmm, isoToLocal, localToIso, todayLocal } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Pointage" };
export const dynamic = "force-dynamic";

export default async function Pointage() {
  await requireUser("timeclock");
  const store = await getStore();
  const today = todayLocal();
  let punches: Awaited<ReturnType<typeof store.listTimeEntries>> = []; let missing = false;
  try { punches = await store.listTimeEntries(localToIso(addDays(today, -1), 0), localToIso(addDays(today, 1), 0)); } catch { missing = true; }
  const staff = (await store.listStaff()).filter((s) => s.active);
  const people: PunchPerson[] = staff.map((s) => {
    const mine = punches.filter((t) => t.staffId === s.id);
    const open = mine.find((t) => !t.outAt);
    const last = mine.at(-1);
    return { id: s.id, name: s.name, color: s.color, state: open ? "in" : last && isoToLocal(last.inAt).date === today ? "out" : "none", since: open ? hhmm(isoToLocal(open.inAt).minutes) : last?.outAt ? hhmm(isoToLocal(last.outAt).minutes) : "", hasPin: !!s.pinHash };
  });
  return (
    <>
      <h1 className="bod adm__h1">Pointage</h1>
      {missing && <p className="adm__warn">Le pointage nécessite la migration <code>0003_pointage_absences.sql</code> dans Supabase.</p>}
      <PunchPad people={people} />
    </>
  );
}
