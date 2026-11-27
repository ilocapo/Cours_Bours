import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { computePayroll, hm } from "@/lib/booking/payroll";
import { formatXof } from "@/lib/booking/money";
import { todayLocal } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Paie" };
export const dynamic = "force-dynamic";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const shift = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

export default async function Paie({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await requireUser("payroll");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : todayLocal().slice(0, 7);
  const rows = await computePayroll(await getStore(), month);
  const [y, mo] = month.split("-").map(Number);
  const tot = rows.reduce((t, r) => ({ w: t.w + r.workedMin, p: t.p + r.plannedMin }), { w: 0, p: 0 });
  return (
    <>
      <div className="adm__bar"><div><p className="lb dim">Heures et présences</p><h1 className="bod adm__h1" style={{ textTransform: "capitalize" }}>{MONTHS[mo - 1]} {y}</h1></div>
        <div className="adm__actions"><Link className="btn btn--outline-prune btn--sm lb" href={`/admin/paie?m=${shift(month, -1)}`}>‹ Mois précédent</Link><Link className="btn btn--outline-prune btn--sm lb" href={`/admin/paie?m=${shift(month, 1)}`}>Mois suivant ›</Link>
          <a className="btn btn--prune btn--sm lb" href={`/api/admin/export?type=paie&format=xls&from=${month}-01&to=${month}-31`}>Export Excel</a></div></div>
      {rows.length === 0 ? <p className="dim">Aucune personne dans l&apos;équipe.</p> : (
        <div className="paytable">
          <div className="paytable__head"><span>Personne</span><span>Heures faites</span><span>Prévues</span><span>Jours</span><span>Retards</span><span>Congés</span><span>Prestations</span></div>
          {rows.map((r) => (
            <Link key={r.staffId} href={`/admin/paie/${r.staffId}?m=${month}`} className="paytable__row">
              <strong>{r.name}{r.openNow ? <small className="tag tag--work"> en poste</small> : null}</strong>
              <span data-l="Heures faites"><b>{hm(r.workedMin)}</b><i>{r.plannedMin ? ` (${r.workedMin >= r.plannedMin ? "+" : "−"}${hm(Math.abs(r.workedMin - r.plannedMin))})` : ""}</i></span>
              <span data-l="Prévues">{hm(r.plannedMin)}</span><span data-l="Jours">{r.daysWorked}</span><span data-l="Retards">{r.lateCount}</span>
              <span data-l="Congés">{r.leaveDays + r.sickDays + r.otherDays}{r.sickDays ? ` (dont ${r.sickDays} maladie)` : ""}</span>
              <span data-l="Prestations">{r.prestations}{can(me.role, "invoices.read") && r.invoicedXof ? ` · ${formatXof(r.invoicedXof)}` : ""}</span>
            </Link>
          ))}
          <div className="paytable__row paytable__row--tot"><strong>Total</strong><span data-l="Heures faites"><b>{hm(tot.w)}</b></span><span data-l="Prévues">{hm(tot.p)}</span><span /><span /><span /><span /></div>
        </div>
      )}
      <p className="lb lb--s dim">Heures faites = somme des pointages (arrivée à départ). Prévues = planning de la personne, hors congés approuvés et fermetures. Un retard = arrivée plus de 10 minutes après l&apos;heure prévue. Ouvrez une personne pour corriger un oubli de pointage.</p>
    </>
  );
}
