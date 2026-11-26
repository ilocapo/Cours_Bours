import type { Metadata } from "next";
import { categories } from "@/data/categories";
import { getStore } from "@/lib/booking/store";
import { saveStaffAction } from "../../actions";

export const metadata: Metadata = { title: "Équipe" };
export const dynamic = "force-dynamic";

export default async function Equipe() {
  const store = await getStore();
  const staff = await store.listStaff();
  const row = (s?: (typeof staff)[number]) => (
    <form key={s?.id ?? "new"} action={saveStaffAction} className="adm__srv adm__srv--staff">
      {s && <input type="hidden" name="id" value={s.id} />}
      <input name="name" defaultValue={s?.name ?? ""} placeholder="Prénom" aria-label="Prénom" required />
      <fieldset className="adm__cats"><legend className="lb lb--s">Univers</legend>{categories.map((c) => <label key={c.id} className="check"><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={s ? s.categoryIds.includes(c.id) : true} /><span>{c.name}</span></label>)}</fieldset>
      <label className="check"><input type="checkbox" name="active" defaultChecked={s ? s.active : true} /><span>Active</span></label>
      <button className="btn btn--outline-prune btn--sm lb">{s ? "Enregistrer" : "Ajouter"}</button>
    </form>
  );
  return (
    <>
      <h1 className="bod adm__h1">Équipe</h1>
      <p className="dim">Les clientes peuvent choisir une personne en réservant. Sans personne enregistrée, le salon accepte autant de rendez-vous en parallèle que le nombre de postes (Réglages).</p>
      {staff.map((s) => row(s))}
      <h2 className="bod adm__h2">Ajouter</h2>
      {row()}
    </>
  );
}
