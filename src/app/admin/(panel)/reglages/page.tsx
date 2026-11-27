import type { Metadata } from "next";
import { getStore } from "@/lib/booking/store";
import { requireUser } from "@/lib/admin/session";
import { addClosureAction, removeClosureAction, saveSettingsAction } from "../../actions";
import { longDate } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Réglages" };
export const dynamic = "force-dynamic";

export default async function Reglages({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireUser("settings");
  const sp = await searchParams;
  const store = await getStore();
  const [s, hours] = await Promise.all([store.getSettings(), store.getHours()]);
  return (
    <>
      <h1 className="bod adm__h1">Réglages</h1>
      {sp.ok && <p className="adm__ok" role="status">Réglages enregistrés.</p>}
      <form action={saveSettingsAction} className="adm__form">
        <h2 className="bod adm__h2">Horaires d&apos;ouverture</h2>
        <div className="adm__hours">
          {hours.map((h) => (
            <div key={h.weekday} className="adm__hrow">
              <span className="bod">{h.label}</span>
              <label className="check"><input type="checkbox" name={`closed-${h.weekday}`} defaultChecked={!h.opens} /><span>Fermé</span></label>
              <input type="time" name={`opens-${h.weekday}`} defaultValue={h.opens ?? "09:00"} aria-label={`${h.label} ouverture`} />
              <input type="time" name={`closes-${h.weekday}`} defaultValue={h.closes ?? "20:00"} aria-label={`${h.label} fermeture`} />
            </div>
          ))}
        </div>
        <h2 className="bod adm__h2">Réservation</h2>
        <div className="adm__grid">
          <label className="field"><span className="lb lb--s">Pas des créneaux (min)</span><select name="slotStepMin" defaultValue={s.slotStepMin}><option>15</option><option>30</option><option>60</option></select></label>
          <label className="field"><span className="lb lb--s">Délai minimal avant un rendez-vous (min)</span><input name="leadTimeMin" type="number" min={0} step={15} defaultValue={s.leadTimeMin} /></label>
          <label className="field"><span className="lb lb--s">Réservable jusqu&apos;à (jours)</span><input name="maxDaysAhead" type="number" min={1} defaultValue={s.maxDaysAhead} /></label>
          <label className="field"><span className="lb lb--s">Postes en parallèle (sans équipe saisie)</span><input name="capacity" type="number" min={1} defaultValue={s.capacity} /></label>
        </div>
        <h2 className="bod adm__h2">Rappels et alertes</h2>
        <div className="adm__grid">
          <label className="field"><span className="lb lb--s">Rappel de la veille, à (heure)</span><input name="reminderD1Hour" type="number" min={0} max={23} defaultValue={s.reminderD1Hour} /></label>
          <label className="field"><span className="lb lb--s">Rappel avant le rendez-vous (heures)</span><input name="reminderH2Hours" type="number" min={1} max={48} defaultValue={s.reminderH2Hours} /></label>
          <label className="field adm__wide"><span className="lb lb--s">Lien pour laisser un avis Google (envoyé après la prestation)</span><input name="googleReviewUrl" type="url" defaultValue={s.googleReviewUrl ?? ""} placeholder="https://g.page/r/…/review" /></label>
          <label className="field adm__wide"><span className="lb lb--s">E-mail du salon (alertes de réservation et d&apos;annulation)</span><input name="salonEmail" type="email" defaultValue={s.salonEmail} required /></label>
        </div>
        <button className="btn btn--prune btn--md lb">Enregistrer</button>
      </form>

      <h2 className="bod adm__h2">Fermetures exceptionnelles</h2>
      <p className="dim">Jours fériés, travaux, fête : aucun créneau n&apos;est proposé ces jours-là sur le site.</p>
      {(s.closures ?? []).length === 0 ? <p className="dim">Aucune fermeture prévue.</p> : (s.closures ?? []).map((c) => (
        <div key={c.date} className="abs"><span><strong>{longDate(c.date)}</strong> · {c.label}</span>
          <form action={removeClosureAction}><input type="hidden" name="date" value={c.date} /><button className="lb lb--s adm__link">Retirer</button></form></div>
      ))}
      <form action={addClosureAction} className="adm__form adm__grid" style={{ maxWidth: 640 }}>
        <label className="field"><span className="lb lb--s">Date</span><input type="date" name="date" required /></label>
        <label className="field"><span className="lb lb--s">Motif</span><input name="label" placeholder="Jour férié" /></label>
        <div className="adm__wide"><button className="btn btn--outline-prune btn--sm lb">Ajouter la fermeture</button></div>
      </form>
    </>
  );
}
