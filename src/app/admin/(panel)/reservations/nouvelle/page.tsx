import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { categories } from "@/data/categories";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { todayLocal } from "@/lib/booking/time";
import { SOURCE_LABEL } from "@/lib/booking/types";
import { createManual } from "../../../actions";

export const metadata: Metadata = { title: "Nouvelle réservation" };
export const dynamic = "force-dynamic";

export default async function Nouvelle({ searchParams }: { searchParams: Promise<{ date?: string; time?: string; staff?: string; error?: string }> }) {
  await requireUser("bookings.manage");
  const sp = await searchParams;
  const store = await getStore();
  const [services, staff, clients] = await Promise.all([store.listServices(), store.listStaff(), store.listClients()]);
  return (
    <>
      <h1 className="bod adm__h1">Nouvelle réservation</h1>
      <p className="dim">Pour une réservation reçue sur Instagram, WhatsApp, au téléphone ou au salon. Les disponibilités ne sont pas bloquantes ici.</p>
      <Flash erreur={sp.error} />
      <form action={createManual} className="adm__form adm__grid">
        <label className="field"><span className="lb lb--s">Canal</span>
          <select name="canal" defaultValue="instagram">{(["instagram", "whatsapp", "telephone", "comptoir"] as const).map((c) => <option key={c} value={c}>{SOURCE_LABEL[c]}</option>)}</select></label>
        <label className="field"><span className="lb lb--s">Prestation</span>
          <select name="serviceId" required>{categories.map((c) => <optgroup key={c.id} label={c.name}>{services.filter((s) => s.active && s.categoryId === c.id).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>)}</optgroup>)}</select></label>
        <label className="field"><span className="lb lb--s">Date</span><input type="date" name="date" defaultValue={sp.date ?? todayLocal()} required /></label>
        <label className="field"><span className="lb lb--s">Heure</span><input type="time" name="time" step={900} defaultValue={/^\d{2}:\d{2}$/.test(sp.time ?? "") ? sp.time : "10:00"} required /></label>
        <label className="field"><span className="lb lb--s">Avec</span><select name="staffId" defaultValue={sp.staff ?? ""}><option value="">Choisir automatiquement</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="field"><span className="lb lb--s">Nom et prénom</span><input name="name" list="clients" required autoComplete="off" /></label>
        <datalist id="clients">{clients.map((c) => <option key={c.id} value={c.name}>{c.phone}</option>)}</datalist>
        <label className="field"><span className="lb lb--s">Téléphone</span><input name="phone" type="tel" required placeholder="+229 97 00 00 00" /><span className="lb lb--s dim">Sans indicatif, le Bénin (+229) est ajouté.</span></label>
        <label className="field"><span className="lb lb--s">E-mail</span><input name="email" type="email" /></label>
        <label className="field adm__wide"><span className="lb lb--s">Note</span><textarea name="note" rows={2} /></label>
        <label className="check adm__wide"><input type="checkbox" name="consent" /><span>La cliente accepte les rappels par e-mail (la veille et 2 h avant).</span></label>
        <div className="adm__wide"><button className="btn btn--prune btn--md lb">Enregistrer</button></div>
      </form>
    </>
  );
}
