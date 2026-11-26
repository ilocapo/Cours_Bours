import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { formatXof } from "@/lib/booking/money";
import { longWhen } from "@/lib/booking/time";
import { METHOD_LABEL } from "@/lib/booking/types";
import { addPaymentAction, sendInvoiceAction, voidInvoiceAction } from "../../../actions";

export const dynamic = "force-dynamic";
const ST: Record<string, string> = { due: "À payer", partial: "Paiement partiel", paid: "Payée", void: "Annulée" };

export default async function Facture({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const me = await requireUser("invoices.read");
  const { id } = await params; const sp = await searchParams;
  const store = await getStore();
  const inv = await store.getInvoice(id);
  if (!inv) notFound();
  const client = await store.getClient(inv.clientId);
  const staff = (await store.listStaff()).find((s) => s.id === inv.staffId);
  const write = can(me.role, "invoices.write");
  const rest = inv.totalXof - inv.paidXof;
  return (
    <>
      <Link className="lb lb--s" href="/admin/factures">← Factures</Link>
      <h1 className="bod adm__h1">{inv.number}</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p><span className={`pill pill--${inv.status === "paid" ? "confirmed" : inv.status === "void" ? "cancelled" : "noshow"}`}>{ST[inv.status]}</span> <span className="dim">· émise le {longWhen(inv.issuedAt)}{staff ? ` · ${staff.name}` : ""}</span></p>
      <p><strong>{client?.name}</strong>{client?.email && <><br /><a href={`mailto:${client.email}`}>{client.email}</a></>}{inv.sentAt && <><br /><span className="dim">Envoyée par e-mail le {longWhen(inv.sentAt)}</span></>}</p>
      <div className="adm__table">
        {inv.lines.map((l, i) => <div key={i} className="adm__trow adm__trow--2"><span>{l.label}{l.qty > 1 ? ` × ${l.qty}` : ""}</span><span>{formatXof(l.qty * l.unitXof)}</span></div>)}
        {inv.discountXof > 0 && <div className="adm__trow adm__trow--2"><span>Remise</span><span>− {formatXof(inv.discountXof)}</span></div>}
        <div className="adm__trow adm__trow--2"><strong>Total</strong><strong>{formatXof(inv.totalXof)}</strong></div>
        <div className="adm__trow adm__trow--2"><span>Payé{inv.method ? ` (${METHOD_LABEL[inv.method]})` : ""}</span><span>{formatXof(inv.paidXof)}</span></div>
        {inv.status !== "void" && rest > 0 && <div className="adm__trow adm__trow--2"><strong>Reste à payer</strong><strong>{formatXof(rest)}</strong></div>}
      </div>
      {inv.note && <p className="dim">Note : {inv.note}</p>}
      <div className="adm__actions">
        <a className="btn btn--prune btn--sm lb" href={`/facture/${inv.token}`} target="_blank" rel="noopener noreferrer">Voir et imprimer</a>
        {write && client?.email && <form action={sendInvoiceAction}><input type="hidden" name="id" value={inv.id} /><button className="btn btn--outline-prune btn--sm lb">{inv.sentAt ? "Renvoyer par e-mail" : "Envoyer par e-mail"}</button></form>}
        {can(me.role, "bookings.manage") && <form action={voidInvoiceAction}><input type="hidden" name="id" value={inv.id} /><button className="btn btn--outline-prune btn--sm lb">{inv.status === "void" ? "Rétablir" : "Annuler la facture"}</button></form>}
      </div>
      {write && inv.status !== "void" && rest > 0 && (
        <form action={addPaymentAction} className="adm__form adm__grid adm__inv">
          <input type="hidden" name="id" value={inv.id} />
          <label className="field"><span className="lb lb--s">Encaisser (F CFA)</span><input name="amount" inputMode="numeric" defaultValue={rest} required /></label>
          <label className="field"><span className="lb lb--s">Mode de paiement</span><select name="method" defaultValue="especes">{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <div className="adm__wide"><button className="btn btn--prune btn--sm lb">Enregistrer le paiement</button></div>
        </form>
      )}
    </>
  );
}
