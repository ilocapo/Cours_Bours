import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { ABSENCE_LABEL } from "@/lib/booking/types";
import { longDate, todayLocal } from "@/lib/booking/time";
import { decideAbsenceAction, requestAbsenceAction } from "../../actions";

export const metadata: Metadata = { title: "Congés" };
export const dynamic = "force-dynamic";
const ST: Record<string, string> = { demande: "À valider", approuvee: "Approuvée", refusee: "Refusée" };

export default async function Absences({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireUser("absences.manage");
  const sp = await searchParams;
  const store = await getStore();
  let list: Awaited<ReturnType<typeof store.listAbsences>> = []; let missing = false;
  try { list = await store.listAbsences(); } catch { missing = true; }
  const staff = await store.listStaff();
  const name = (id: string) => staff.find((s) => s.id === id)?.name ?? "—";
  const today = todayLocal();
  const pending = list.filter((a) => a.status === "demande");
  const rest = list.filter((a) => a.status !== "demande" && a.toDate >= today).sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  const row = (a: (typeof list)[number]) => (
    <div key={a.id} className="abs">
      <span><strong>{name(a.staffId)}</strong> · {ABSENCE_LABEL[a.kind]}<br /><span className="dim">{a.fromDate === a.toDate ? longDate(a.fromDate) : `du ${longDate(a.fromDate)} au ${longDate(a.toDate)}`}{a.note ? ` · ${a.note}` : ""}</span></span>
      <span className={`pill pill--${a.status === "approuvee" ? "confirmed" : a.status === "refusee" ? "cancelled" : "noshow"}`}>{ST[a.status]}</span>
      <span className="adm__actions">
        {a.status === "demande" && <><form action={decideAbsenceAction}><input type="hidden" name="id" value={a.id} /><button name="decision" value="approuvee" className="btn btn--prune btn--sm lb">Approuver</button></form><form action={decideAbsenceAction}><input type="hidden" name="id" value={a.id} /><button name="decision" value="refusee" className="btn btn--outline-prune btn--sm lb">Refuser</button></form></>}
        <form action={decideAbsenceAction}><input type="hidden" name="id" value={a.id} /><button name="decision" value="supprimer" className="lb lb--s adm__link">Supprimer</button></form>
      </span>
    </div>
  );
  return (
    <>
      <h1 className="bod adm__h1">Congés et absences</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      {missing && <p className="adm__warn">Cette page nécessite la migration <code>0003_pointage_absences.sql</code> dans Supabase.</p>}
      <p className="dim">Une absence approuvée retire la personne des créneaux proposés aux clientes, et compte dans le planning et la paie.</p>
      {pending.length > 0 && (<><h2 className="bod adm__h2">À valider ({pending.length})</h2>{pending.map(row)}</>)}
      <h2 className="bod adm__h2">À venir</h2>
      {rest.length === 0 ? <p className="dim">Aucune absence à venir.</p> : rest.map(row)}
      <h2 className="bod adm__h2">Déclarer une absence</h2>
      <form action={requestAbsenceAction} className="adm__form adm__grid">
        <label className="field"><span className="lb lb--s">Personne</span><select name="staffId" required>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="field"><span className="lb lb--s">Type</span><select name="kind">{Object.entries(ABSENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span className="lb lb--s">Du</span><input type="date" name="from" defaultValue={today} required /></label>
        <label className="field"><span className="lb lb--s">Au (inclus)</span><input type="date" name="to" defaultValue={today} required /></label>
        <label className="field adm__wide"><span className="lb lb--s">Note (facultatif)</span><input name="note" /></label>
        <div className="adm__wide"><button className="btn btn--prune btn--md lb">Enregistrer l&apos;absence</button></div>
      </form>
    </>
  );
}
