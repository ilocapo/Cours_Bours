import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import { categories } from "@/data/categories";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { dayName } from "@/lib/booking/time";
import { saveStaffAction, setPinAction } from "../../../actions";

export const metadata: Metadata = { title: "Équipe" };
export const dynamic = "force-dynamic";
const COLORS = [["#1C1013", "Brun prune"], ["#A07A52", "Bronze"], ["#8C8C8C", "Gris"], ["#5A4348", "Prune clair"], ["#C9B8A3", "Sable"]];
const WD = [1, 2, 3, 4, 5, 6, 7];

export default async function Personne({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireUser("team");
  const { id } = await params; const sp = await searchParams;
  const store = await getStore();
  const [staff, services, hours] = await Promise.all([store.listStaff(), store.listServices(), store.getHours()]);
  const isNew = id === "nouveau";
  const s = isNew ? undefined : staff.find((x) => x.id === id);
  if (!isNew && !s) notFound();
  const rows = WD.map((wd) => {
    const h = hours.find((x) => x.weekday === wd);
    const sh = s?.schedule ? s.schedule[wd] : h?.opens && h?.closes ? { start: h.opens, end: h.closes } : null;
    return { wd, on: !!sh, start: sh?.start ?? "09:00", end: sh?.end ?? "18:00" };
  });
  return (
    <>
      <Link className="lb lb--s" href="/admin/equipe">← Équipe</Link>
      <h1 className="bod adm__h1">{isNew ? "Nouvelle personne" : s!.name}</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <form action={saveStaffAction} className="adm__form adm__stack">
        {s && <input type="hidden" name="id" value={s.id} />}
        <section className="adm__card">
          <h2 className="bod adm__h2">1 · Qui est-ce ?</h2>
          <div className="adm__grid">
            <label className="field"><span className="lb lb--s">Prénom</span><input name="name" defaultValue={s?.name ?? ""} required autoFocus={isNew} /></label>
            <label className="field"><span className="lb lb--s">Couleur dans l&apos;agenda</span><select name="color" defaultValue={s?.color ?? COLORS[0][0]}>{COLORS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          </div>
          <label className="check"><input type="checkbox" name="active" defaultChecked={s ? s.active : true} /><span>En poste (décochez si elle a quitté le salon)</span></label>
        </section>

        <section className="adm__card">
          <h2 className="bod adm__h2">2 · Ce qu&apos;elle fait</h2>
          <p className="dim">Les clientes ne verront de créneaux que pour ce qu&apos;elle sait faire. Rien de coché : elle fait tout.</p>
          <fieldset className="adm__cats"><legend className="lb lb--s">Univers</legend>
            {categories.map((c) => <label key={c.id} className="check"><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={s?.categoryIds.includes(c.id)} /><span>{c.name}</span></label>)}</fieldset>
          <details className="adm__more"><summary className="lb lb--s">Choisir des prestations précises (facultatif)</summary>
            <fieldset className="adm__cats">{services.filter((x) => x.active).map((x) => <label key={x.id} className="check"><input type="checkbox" name="serviceIds" value={x.id} defaultChecked={s?.serviceIds.includes(x.id)} /><span>{x.name}</span></label>)}</fieldset></details>
        </section>

        <section className="adm__card">
          <h2 className="bod adm__h2">3 · Quand elle travaille</h2>
          <label className="check"><input type="checkbox" name="custom" defaultChecked={!!s?.schedule} /><span><strong>Planning personnel.</strong> Décoché : elle suit les horaires d&apos;ouverture du salon.</span></label>
          <div className="wk">
            {rows.map((r) => (
              <div key={r.wd} className="wk__row">
                <label className="check"><input type="checkbox" name={`on-${r.wd}`} defaultChecked={r.on} /><span className="bod">{dayName(`2026-11-0${r.wd}`)}</span></label>
                <span className="wk__t"><input type="time" name={`start-${r.wd}`} defaultValue={r.start} aria-label={`${dayName(`2026-11-0${r.wd}`)} début`} /> <i>à</i> <input type="time" name={`end-${r.wd}`} defaultValue={r.end} aria-label={`${dayName(`2026-11-0${r.wd}`)} fin`} /></span>
              </div>
            ))}
          </div>
        </section>
        <button className="btn btn--prune btn--md lb">{isNew ? "Ajouter à l'équipe" : "Enregistrer"}</button>
      </form>

      {s && (
        <section className="adm__card">
          <h2 className="bod adm__h2">4 · Code de pointage</h2>
          <p className="dim">Un code de 4 à 6 chiffres que <strong>seule {s.name}</strong> connaît. Elle l&apos;utilise pour pointer son arrivée et son départ ; les heures servent à la paie du mois. {s.pinHash ? "Un code est déjà défini." : "Aucun code défini pour l'instant."}</p>
          <form action={setPinAction} className="adm__form adm__form--inline">
            <input type="hidden" name="id" value={s.id} />
            <label className="field"><span className="lb lb--s">{s.pinHash ? "Nouveau code" : "Code"}</span><input name="pin" inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="off" placeholder="••••" required /></label>
            <button className="btn btn--outline-prune btn--sm lb">{s.pinHash ? "Changer le code" : "Définir le code"}</button>
          </form>
          <p className="lb lb--s dim">Après 5 codes faux, le pointage est bloqué 10 minutes.</p>
        </section>
      )}
    </>
  );
}
