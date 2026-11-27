import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { site } from "@/data/site";
import { getStore } from "@/lib/booking/store";
import { formatXof } from "@/lib/booking/money";
import { longDate, isoToLocal } from "@/lib/booking/time";
import { METHOD_LABEL } from "@/lib/booking/types";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Facture", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Facture imprimable (ou à enregistrer en PDF depuis le navigateur). Lien secret, jamais indexé.
export default async function Facture({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const inv = await store.getInvoiceByToken(token);
  if (!inv) notFound();
  const client = await store.getClient(inv.clientId);
  const rest = inv.totalXof - inv.paidXof;
  return (
    <main className="invoice">
      <header className="invoice__head">
        <span className="logo"><Image src="/logo/logo-zst.png" alt="ZST Beauty Center" width={56} height={56} /></span>
        <div><h1 className="bod">Facture {inv.number}</h1><p className="lb dim">{longDate(isoToLocal(inv.issuedAt).date)}</p></div>
      </header>
      <section className="invoice__parties">
        <div><p className="lb lb--s dim">Émetteur</p><p><strong>{site.name}</strong><br />{site.address}<br />{site.phone && formatPhone(site.phone.replace(/[^\d+]/g, ""))}<br />{site.email}</p></div>
        <div><p className="lb lb--s dim">Facturée à</p><p><strong>{client?.name}</strong><br />{client?.phone && formatPhone(client.phone)}<br />{client?.email}</p></div>
      </section>
      <table className="invoice__table">
        <thead><tr><th>Prestation</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead>
        <tbody>
          {inv.lines.map((l, i) => <tr key={i}><td>{l.label}</td><td>{l.qty}</td><td>{formatXof(l.unitXof)}</td><td>{formatXof(l.qty * l.unitXof)}</td></tr>)}
          {inv.discountXof > 0 && <tr><td colSpan={3}>Remise</td><td>− {formatXof(inv.discountXof)}</td></tr>}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}>Total</td><td><strong>{formatXof(inv.totalXof)}</strong></td></tr>
          <tr><td colSpan={3}>Payé{inv.method ? ` · ${METHOD_LABEL[inv.method]}` : ""}</td><td>{formatXof(inv.paidXof)}</td></tr>
          {inv.status !== "void" && rest > 0 && <tr><td colSpan={3}><strong>Reste à payer</strong></td><td><strong>{formatXof(rest)}</strong></td></tr>}
        </tfoot>
      </table>
      {inv.status === "void" && <p className="invoice__void">Facture annulée</p>}
      {inv.note && <p className="dim">{inv.note}</p>}
      <p className="lb dim invoice__thanks">Merci de votre confiance · Là où commence la beauté.</p>
      <PrintButton />
    </main>
  );
}
