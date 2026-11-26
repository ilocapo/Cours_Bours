import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { formatXof } from "@/lib/booking/money";
import { longDate, isoToLocal } from "@/lib/booking/time";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("clients");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const store = await getStore();
  const [clients, bookings, invoices] = await Promise.all([store.listClients(), store.listBookings(), store.listInvoices()]);
  const rows = clients
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) || (c.email ?? "").toLowerCase().includes(q))
    .map((c) => { const mine = bookings.filter((b) => b.clientId === c.id && b.status !== "cancelled"); return { c, n: mine.length, last: mine.at(-1)?.startsAt, ca: invoices.filter((i) => i.clientId === c.id && i.status !== "void").reduce((s, i) => s + i.totalXof, 0) }; })
    .sort((a, b) => a.c.name.localeCompare(b.c.name));
  return (
    <>
      <div className="adm__bar"><h1 className="bod adm__h1">Clients</h1><a className="btn btn--outline-prune btn--sm lb" href="/api/admin/export?type=clients&format=csv">Export CSV</a></div>
      <form className="adm__form adm__form--inline" role="search"><label className="field"><span className="lb lb--s">Rechercher</span><input name="q" defaultValue={sp.q ?? ""} placeholder="Nom, téléphone, e-mail" /></label><button className="btn btn--outline-prune btn--sm lb">Chercher</button></form>
      {rows.length === 0 ? <p className="dim">Aucune cliente pour l&apos;instant. Elles apparaissent à la première réservation.</p> : (
        <ul className="adm__list">{rows.map(({ c, n, last, ca }) => (
          <li key={c.id}><Link href={`/admin/clients/${c.id}`} className="adm__row adm__row--wide">
            <span><strong>{c.name}</strong><br /><span className="dim">{formatPhone(c.phone)}{c.email ? ` · ${c.email}` : ""}</span></span>
            <span className="dim">{n} rendez-vous{last ? ` · dernier le ${longDate(isoToLocal(last).date)}` : ""}{ca ? ` · ${formatXof(ca)}` : ""}</span><span />
          </Link></li>))}</ul>
      )}
    </>
  );
}
