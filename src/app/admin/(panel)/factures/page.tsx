import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { formatXof } from "@/lib/booking/money";
import { isoToLocal, shortDate, todayLocal, addDays } from "@/lib/booking/time";
import { METHOD_LABEL } from "@/lib/booking/types";

export const metadata: Metadata = { title: "Factures" };
export const dynamic = "force-dynamic";
const ST: Record<string, string> = { due: "À payer", partial: "Partiel", paid: "Payée", void: "Annulée" };

export default async function Factures({ searchParams }: { searchParams: Promise<{ s?: string; m?: string }> }) {
  await requireUser("invoices.read");
  const sp = await searchParams;
  const store = await getStore();
  const [invoices, clients] = await Promise.all([store.listInvoices(), store.listClients()]);
  const today = todayLocal();
  const from = sp.m === "tout" ? "2000-01-01" : sp.m === "7j" ? addDays(today, -6) : sp.m === "30j" ? addDays(today, -29) : today.slice(0, 8) + "01";
  let list = invoices.filter((i) => isoToLocal(i.issuedAt).date >= from);
  if (sp.s === "impayees") list = list.filter((i) => i.status === "due" || i.status === "partial");
  else if (sp.s === "payees") list = list.filter((i) => i.status === "paid");
  const live = list.filter((i) => i.status !== "void");
  const total = live.reduce((s, i) => s + i.totalXof, 0), paid = live.reduce((s, i) => s + i.paidXof, 0);
  const tabs = [["", "Toutes"], ["impayees", "À encaisser"], ["payees", "Payées"]];
  const per = [["", "Ce mois"], ["7j", "7 jours"], ["30j", "30 jours"], ["tout", "Tout"]];
  const href = (s: string, m: string) => `/admin/factures?${new URLSearchParams({ ...(s ? { s } : {}), ...(m ? { m } : {}) })}`;
  return (
    <>
      <div className="adm__bar"><h1 className="bod adm__h1">Factures</h1>
        <div className="adm__actions"><a className="btn btn--outline-prune btn--sm lb" href={`/api/admin/export?type=factures&format=csv&from=${from}`}>CSV</a><a className="btn btn--outline-prune btn--sm lb" href={`/api/admin/export?type=factures&format=xls&from=${from}`}>Excel</a></div></div>
      <div className="adm__chips">{tabs.map(([k, l]) => <Link key={k} href={href(k, sp.m ?? "")} className={(sp.s ?? "") === k ? "is-on" : ""}>{l}</Link>)}</div>
      <div className="adm__chips">{per.map(([k, l]) => <Link key={k} href={href(sp.s ?? "", k)} className={(sp.m ?? "") === k ? "is-on" : ""}>{l}</Link>)}</div>
      <p className="dim">{live.length} facture(s) · facturé {formatXof(total)} · encaissé {formatXof(paid)} · reste {formatXof(total - paid)}</p>
      {list.length === 0 ? <p className="dim">Aucune facture sur cette période. Les factures se créent depuis le rendez-vous, dans l&apos;agenda (« Facturer la prestation »).</p> : (
        <ul className="adm__list">{list.map((i) => (
          <li key={i.id}><Link href={`/admin/factures/${i.id}`} className="adm__row adm__row--wide">
            <span><span className="bod">{i.number}</span><br /><span className="lb lb--s dim">{shortDate(isoToLocal(i.issuedAt).date)}</span></span>
            <span><strong>{clients.find((c) => c.id === i.clientId)?.name ?? "—"}</strong><br /><span className="dim">{formatXof(i.totalXof)}{i.method ? ` · ${METHOD_LABEL[i.method]}` : ""}{i.status !== "paid" && i.status !== "void" ? ` · reste ${formatXof(i.totalXof - i.paidXof)}` : ""}</span></span>
            <span className={`pill pill--${i.status === "paid" ? "confirmed" : i.status === "void" ? "cancelled" : "noshow"}`}>{ST[i.status]}</span>
          </Link></li>))}</ul>
      )}
    </>
  );
}
