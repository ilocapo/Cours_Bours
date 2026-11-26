import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import { isoToLocal, longWhen } from "@/lib/booking/time";
import { formatPhone } from "@/lib/phone";
import { STATUS_LABEL } from "@/lib/admin/view";
import { saveClientNotes } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function Fiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const store = await getStore();
  const c = await store.getClient(id);
  if (!c) notFound();
  const mine = (await store.listBookings()).filter((b) => b.clientId === id).reverse();
  const views = await Promise.all(mine.map((b) => toView(store, b)));
  const done = mine.filter((b) => b.status === "done").length; const noshow = mine.filter((b) => b.status === "noshow").length;
  return (
    <>
      <Link className="lb lb--s" href="/admin/clients">← Clients</Link>
      <h1 className="bod adm__h1">{c.name}</h1>
      <p><a href={`tel:${c.phone.replace(/\s/g, "")}`}>{formatPhone(c.phone)}</a> · <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>{c.email && <> · <a href={`mailto:${c.email}`}>{c.email}</a></>}</p>
      <div className="adm__stats">
        <div className="adm__stat"><span className="bod">{mine.filter((b) => b.status !== "cancelled").length}</span><span className="lb lb--s">rendez-vous</span></div>
        <div className="adm__stat"><span className="bod">{done}</span><span className="lb lb--s">terminés</span></div>
        <div className={`adm__stat ${noshow ? "is-warn" : ""}`}><span className="bod">{noshow}</span><span className="lb lb--s">absences</span></div>
      </div>
      {sp.error && <p className="adm__warn" role="alert">{sp.error}</p>}
      <form action={saveClientNotes} className="adm__form adm__grid">
        <input type="hidden" name="id" value={c.id} />
        <label className="field"><span className="lb lb--s">Nom</span><input name="name" defaultValue={c.name} required /></label>
        <label className="field"><span className="lb lb--s">Téléphone</span><input name="phone" defaultValue={formatPhone(c.phone)} required placeholder="+229 97 00 00 00" /></label>
        <label className="field"><span className="lb lb--s">E-mail</span><input name="email" type="email" defaultValue={c.email ?? ""} /></label>
        <p className="lb lb--s dim">Rappels par e-mail : {c.consentReminders ? "acceptés" : "refusés"}</p>
        <label className="field adm__wide"><span className="lb lb--s">Notes (préférences, allergies, coiffures habituelles…)</span><textarea name="notes" rows={5} defaultValue={c.notes} /></label>
        <div className="adm__wide"><button className="btn btn--prune btn--sm lb">Enregistrer la fiche</button></div>
      </form>
      <h2 className="bod adm__h2">Historique</h2>
      {views.length === 0 ? <p className="dim">Aucun rendez-vous.</p> : <ul className="adm__list">{views.map((b) => (
        <li key={b.id}><Link href={`/admin/agenda?d=${isoToLocal(b.startsAt).date}&b=${b.id}`} className="adm__row adm__row--wide"><span>{longWhen(b.startsAt)}</span><span>{b.serviceName}</span><span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span></Link></li>))}</ul>}
    </>
  );
}
