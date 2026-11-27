import type { Metadata } from "next";
import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { entryMinutes, hm, monthsDays } from "@/lib/booking/payroll";
import { dayState } from "@/lib/booking/staffday";
import { ABSENCE_LABEL } from "@/lib/booking/types";
import { addDays, dayName, hhmm, isoToLocal, localToIso, longDate, todayLocal, weekStart } from "@/lib/booking/time";
import { requestAbsenceAction, setOwnPinAction } from "../../actions";

export const metadata: Metadata = { title: "Mon espace" };
export const dynamic = "force-dynamic";
const ST: Record<string, string> = { demande: "En attente", approuvee: "Approuvée", refusee: "Refusée" };

export default async function Moi({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const me = await requireUser("me");
  const sp = await searchParams;
  const store = await getStore();
  const st = (await store.listStaff()).find((s) => s.id === me.staffId);
  if (!st) return (<><h1 className="bod adm__h1">Mon espace</h1><p className="adm__warn">Votre compte n&apos;est pas encore relié à une fiche de l&apos;équipe. Demandez à la gérante de faire le lien (menu Comptes).</p></>);
  const today = todayLocal(); const month = today.slice(0, 7);
  const days = monthsDays(month);
  let entries: Awaited<ReturnType<typeof store.listTimeEntries>> = []; let absences: Awaited<ReturnType<typeof store.listAbsences>> = [];
  try { entries = (await store.listTimeEntries(localToIso(days[0], 0), localToIso(addDays(days.at(-1)!, 1), 0))).filter((e) => e.staffId === st.id); absences = await store.listAbsences(); } catch { /* migration 0003 */ }
  const [hours, settings] = await Promise.all([store.getHours(), store.getSettings()]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));
  const mine = absences.filter((a) => a.staffId === st.id && a.toDate >= today).sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  const worked = entries.reduce((t, e) => t + entryMinutes(e), 0);
  const todayEntries = entries.filter((e) => isoToLocal(e.inAt).date === today);
  return (
    <>
      <p className="lb dim">Bonjour {st.name}</p>
      <h1 className="bod adm__h1">Mon espace</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <div className="kpis">
        <div className="kpi"><span className="lb lb--s">Heures ce mois</span><strong className="bod">{hm(worked)}</strong></div>
        <div className="kpi"><span className="lb lb--s">Aujourd&apos;hui</span><strong className="bod">{todayEntries.length ? `${hhmm(isoToLocal(todayEntries[0].inAt).minutes)}${todayEntries.at(-1)!.outAt ? ` → ${hhmm(isoToLocal(todayEntries.at(-1)!.outAt!).minutes)}` : " → en poste"}` : "Pas pointée"}</strong></div>
      </div>
      <p><Link className="btn btn--prune btn--sm lb" href="/admin/agenda">Voir mon agenda</Link></p>

      <h2 className="bod adm__h2">Mon planning de la semaine</h2>
      <div className="plan plan--me">
        {week.map((d) => { const s = dayState(st, d, hours, absences, settings.closures ?? []); return (
          <div key={d} className={`plan__me ${d === today ? "is-today" : ""}`}><b>{dayName(d).slice(0, 3)} {Number(d.slice(8))}</b><span className={`plan__c plan__c--${s.kind}`}>{s.label}</span></div>
        ); })}
      </div>

      <h2 className="bod adm__h2">Mes congés et absences</h2>
      {mine.length === 0 ? <p className="dim">Aucune absence à venir.</p> : mine.map((a) => (
        <p key={a.id} className="abs"><span><strong>{ABSENCE_LABEL[a.kind]}</strong> · {a.fromDate === a.toDate ? longDate(a.fromDate) : `du ${longDate(a.fromDate)} au ${longDate(a.toDate)}`}</span><span className={`pill pill--${a.status === "approuvee" ? "confirmed" : a.status === "refusee" ? "cancelled" : "noshow"}`}>{ST[a.status]}</span></p>
      ))}
      <details className="adm__more"><summary className="btn btn--outline-prune btn--sm lb">Demander un congé</summary>
        <form action={requestAbsenceAction} className="adm__form adm__grid">
          <label className="field"><span className="lb lb--s">Type</span><select name="kind"><option value="conge">Congé</option><option value="maladie">Maladie</option><option value="autre">Autre</option></select></label>
          <span />
          <label className="field"><span className="lb lb--s">Du</span><input type="date" name="from" defaultValue={today} required /></label>
          <label className="field"><span className="lb lb--s">Au (inclus)</span><input type="date" name="to" defaultValue={today} required /></label>
          <label className="field adm__wide"><span className="lb lb--s">Un mot pour la gérante</span><input name="note" /></label>
          <div className="adm__wide"><button className="btn btn--prune btn--sm lb">Envoyer la demande</button></div>
        </form>
      </details>

      <h2 className="bod adm__h2">Mon code de pointage</h2>
      <form action={setOwnPinAction} className="adm__form adm__grid" style={{ maxWidth: 520 }}>
        <label className="field"><span className="lb lb--s">Nouveau code (4 à 6 chiffres)</span><input name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="off" required /></label>
        <label className="field"><span className="lb lb--s">Répéter</span><input name="pin2" type="password" inputMode="numeric" maxLength={6} autoComplete="off" required /></label>
        <div className="adm__wide"><button className="btn btn--outline-prune btn--sm lb">{st.pinHash ? "Changer mon code" : "Définir mon code"}</button></div>
      </form>
    </>
  );
}
