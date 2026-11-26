import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { categories } from "@/data/categories";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { saveServiceAction } from "../../actions";

export const metadata: Metadata = { title: "Prestations" };
export const dynamic = "force-dynamic";

export default async function Prestations({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireUser("catalog");
  const sp = await searchParams;
  const store = await getStore();
  const services = await store.listServices();
  return (
    <>
      <h1 className="bod adm__h1">Prestations</h1>
      <Flash ok={sp.ok} />
      <p className="dim">Les prix ne sont <strong>jamais affichés sur le site</strong> : ils sont négociables, le montant réel se saisit à la facturation. Le « tarif indicatif » ci-dessous est un repère interne facultatif. Une prestation décochée disparaît de la réservation.</p>
      {categories.map((c) => (
        <section key={c.id}>
          <h2 className="bod adm__h2">{c.name}</h2>
          {services.filter((s) => s.categoryId === c.id).map((s) => (
            <form key={s.id} action={saveServiceAction} className="adm__srv">
              <input type="hidden" name="id" value={s.id} /><input type="hidden" name="categoryId" value={c.id} />
              <input name="name" defaultValue={s.name} aria-label="Nom" required />
              <label><input name="durationMin" type="number" min={5} step={5} defaultValue={s.durationMin} aria-label="Durée en minutes" /> <span className="lb lb--s">min</span></label>
              <label><input name="price" inputMode="numeric" defaultValue={s.price ?? ""} placeholder="—" aria-label="Tarif indicatif interne en francs CFA" /> <span className="lb lb--s">F CFA, indicatif</span></label>
              <label className="check"><input type="checkbox" name="active" defaultChecked={s.active} /><span>Actif</span></label>
              <button className="btn btn--outline-prune btn--sm lb">Enregistrer</button>
            </form>
          ))}
          <form action={saveServiceAction} className="adm__srv adm__srv--new">
            <input type="hidden" name="categoryId" value={c.id} /><input type="hidden" name="active" value="on" />
            <input name="name" placeholder={`Nouvelle prestation ${c.name.toLowerCase()}`} aria-label="Nom" required />
            <label><input name="durationMin" type="number" min={5} step={5} defaultValue={60} aria-label="Durée" /> <span className="lb lb--s">min</span></label>
            <label><input name="price" inputMode="numeric" placeholder="—" aria-label="Tarif indicatif" /> <span className="lb lb--s">F CFA, indicatif</span></label>
            <span /><button className="btn btn--prune btn--sm lb">Ajouter</button>
          </form>
        </section>
      ))}
    </>
  );
}
