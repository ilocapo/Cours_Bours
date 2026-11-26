import type { Metadata } from "next";
import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { categories } from "@/data/categories";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { dayName, hhmm, isoToLocal, localToIso, addDays, todayLocal, parseHHMM } from "@/lib/booking/time";
import { saveStaffAction } from "../../actions";
import type { Staff } from "@/data/staff";

export const metadata: Metadata = { title: "Équipe" };
export const dynamic = "force-dynamic";
const COLORS = ["#1C1013", "#A07A52", "#8C8C8C", "#5A4348", "#C9B8A3"];
const WD = [1, 2, 3, 4, 5, 6, 7];

export default async function Equipe({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireUser("team");
  const sp = await searchParams;
  const store = await getStore();
  const [staff, services, hours, bookings] = await Promise.all([store.listStaff(), store.listServices(), store.getHours(), store.listBookings(localToIso(todayLocal(), 0), localToIso(addDays(todayLocal(), 7), 0))]);
  const sched = (s?: Staff) => WD.map((wd) => {
    const h = hours.find((x) => x.weekday === wd);
    const sh = s?.schedule ? s.schedule[wd] : h?.opens && h?.closes ? { start: h.opens, end: h.closes } : null;
    return { wd, on: !!sh, start: sh?.start ?? "09:00", end: sh?.end ?? "18:00" };
  });
  const form = (s?: Staff) => (
    <form key={s?.id ?? "new"} action={saveStaffAction} className="adm__staff">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="adm__srv adm__srv--staff">
        <input name="name" defaultValue={s?.name ?? ""} placeholder="Prénom" aria-label="Prénom" required />
        <label className="field"><span className="lb lb--s">Couleur dans l&apos;agenda</span><select name="color" defaultValue={s?.color ?? COLORS[0]}>{COLORS.map((c) => <option key={c} value={c} style={{ background: c, color: "#fff" }}>{c}</option>)}</select></label>
        <label className="check"><input type="checkbox" name="active" defaultChecked={s ? s.active : true} /><span>Active</span></label>
        <button className="btn btn--outline-prune btn--sm lb">{s ? "Enregistrer" : "Ajouter"}</button>
      </div>
      <details className="adm__more" open={!s}>
        <summary className="lb lb--s">Planning et prestations{s ? ` · ${s.schedule ? "planning personnel" : "horaires du salon"}` : ""}</summary>
        <fieldset className="adm__cats"><legend className="lb lb--s">Univers pratiqués (aucun coché = tous)</legend>
          {categories.map((c) => <label key={c.id} className="check"><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={s?.categoryIds.includes(c.id)} /><span>{c.name}</span></label>)}</fieldset>
        <fieldset className="adm__cats"><legend className="lb lb--s">Prestations précises (facultatif)</legend>
          {services.filter((x) => x.active).map((x) => <label key={x.id} className="check"><input type="checkbox" name="serviceIds" value={x.id} defaultChecked={s?.serviceIds.includes(x.id)} /><span>{x.name}</span></label>)}</fieldset>
        <label className="check"><input type="checkbox" name="custom" defaultChecked={!!s?.schedule} /><span>Planning personnel (sinon : horaires d&apos;ouverture du salon)</span></label>
        <div className="adm__hours">
          {sched(s).map((r) => (
            <div key={r.wd} className="adm__hrow adm__hrow--staff">
              <span className="bod">{dayName(`2026-11-0${r.wd}`).slice(0, 3)}.</span>
              <label className="check"><input type="checkbox" name={`on-${r.wd}`} defaultChecked={r.on} /><span>Travaille</span></label>
              <input type="time" name={`start-${r.wd}`} defaultValue={r.start} aria-label="Début" /><input type="time" name={`end-${r.wd}`} defaultValue={r.end} aria-label="Fin" />
            </div>
          ))}
        </div>
        <button className="btn btn--prune btn--sm lb">{s ? "Enregistrer" : "Ajouter"}</button>
      </details>
    </form>
  );
  // Charge de la semaine par personne
  const load = (id: string) => bookings.filter((b) => b.staffId === id && b.status === "confirmed").length;
  return (
    <>
      <h1 className="bod adm__h1">Équipe</h1>
      <Flash ok={sp.ok} />
      <p className="dim">Chaque personne a son planning et ses prestations. Quand une cliente réserve sans choisir, le site propose les créneaux où quelqu&apos;un de compétent est libre, et assigne la réservation. Les comptes de connexion se relient dans <Link href="/admin/utilisateurs">Comptes</Link>.</p>
      {staff.length > 0 && (
        <div className="adm__table" aria-label="Aperçu de la semaine">
          {staff.map((s) => (
            <div key={s.id} className="adm__trow adm__trow--3"><span><i className="dot" style={{ background: s.color }} /><strong>{s.name}</strong></span>
              <span className="dim">{sched(s).filter((r) => r.on).map((r) => `${dayName(`2026-11-0${r.wd}`).slice(0, 3)} ${hhmm(parseHHMM(r.start))}–${hhmm(parseHHMM(r.end))}`).join(" · ") || "Repos"}</span>
              <span className="dim">{load(s.id)} rdv sur 7 jours</span></div>
          ))}
        </div>
      )}
      {staff.map((s) => form(s))}
      <h2 className="bod adm__h2">Ajouter une personne</h2>
      {form()}
      <p className="lb lb--s dim">Heure actuelle au salon : {hhmm(isoToLocal(new Date().toISOString()).minutes)}</p>
    </>
  );
}
