import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { entryMinutes, hm, monthsDays } from "@/lib/booking/payroll";
import { dayState } from "@/lib/booking/staffday";
import { addDays, dayName, hhmm, isoToLocal, localToIso, todayLocal } from "@/lib/booking/time";
import { deleteTimeEntryAction, saveTimeEntryAction } from "../../../actions";

export const metadata: Metadata = { title: "Paie" };
export const dynamic = "force-dynamic";

export default async function PaiePersonne({ params, searchParams }: { params: Promise<{ staffId: string }>; searchParams: Promise<{ m?: string; ok?: string; erreur?: string }> }) {
  const me = await requireUser("payroll");
  const { staffId } = await params; const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : todayLocal().slice(0, 7);
  const store = await getStore();
  const st = (await store.listStaff()).find((x) => x.id === staffId);
  if (!st) notFound();
  const days = monthsDays(month);
  let entries: Awaited<ReturnType<typeof store.listTimeEntries>> = []; let absences: Awaited<ReturnType<typeof store.listAbsences>> = [];
  try { entries = (await store.listTimeEntries(localToIso(days[0], 0), localToIso(addDays(days.at(-1)!, 1), 0))).filter((e) => e.staffId === staffId); absences = await store.listAbsences(); } catch { /* migration 0003 */ }
  const [hours, settings] = await Promise.all([store.getHours(), store.getSettings()]);
  const edit = can(me.role, "team");
  const total = entries.reduce((t, e) => t + entryMinutes(e), 0);
  return (
    <>
      <Link className="lb lb--s" href={`/admin/paie?m=${month}`}>← Paie</Link>
      <h1 className="bod adm__h1">{st.name}</h1>
      <p className="dim">{month} · total {hm(total)}</p>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <div className="paydays">
        {days.map((d) => {
          const ds = dayState(st, d, hours, absences, settings.closures ?? []);
          const es = entries.filter((e) => isoToLocal(e.inAt).date === d);
          return (
            <div key={d} className={`paydays__row ${d === todayLocal() ? "is-today" : ""}`}>
              <span className="paydays__d"><b>{dayName(d).slice(0, 3)}</b> {Number(d.slice(8))}</span>
              <span className={`tag tag--${ds.kind}`}>{ds.label}</span>
              <span className="paydays__e">
                {es.map((e) => (
                  <span key={e.id} className="paydays__entry">
                    {hhmm(isoToLocal(e.inAt).minutes)} → {e.outAt ? hhmm(isoToLocal(e.outAt).minutes) : "en cours"} · <b>{hm(entryMinutes(e))}</b>{e.method === "manual" ? <i> (saisi à la main)</i> : null}
                    {edit && <form action={deleteTimeEntryAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="staffId" value={staffId} /><input type="hidden" name="month" value={month} /><button className="lb lb--s adm__link" aria-label="Supprimer ce pointage">Supprimer</button></form>}
                  </span>
                ))}
                {edit && (
                  <details className="paydays__add"><summary className="lb lb--s">{es.length ? "Ajouter" : "Saisir un pointage"}</summary>
                    <form action={saveTimeEntryAction} className="adm__form adm__form--inline">
                      <input type="hidden" name="staffId" value={staffId} /><input type="hidden" name="month" value={month} /><input type="hidden" name="date" value={d} />
                      <label className="field"><span className="lb lb--s">Arrivée</span><input type="time" name="in" required defaultValue={ds.kind === "work" ? `${String(Math.floor(ds.start / 60)).padStart(2, "0")}:${String(ds.start % 60).padStart(2, "0")}` : "09:00"} /></label>
                      <label className="field"><span className="lb lb--s">Départ</span><input type="time" name="out" /></label>
                      <label className="field"><span className="lb lb--s">Motif</span><input name="note" placeholder="oubli de pointage" /></label>
                      <button className="btn btn--outline-prune btn--sm lb">Enregistrer</button>
                    </form>
                  </details>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
