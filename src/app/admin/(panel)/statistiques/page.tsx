import Link from "next/link";
import type { Metadata } from "next";
import { BarChart, Donut, HBars, Kpi } from "@/components/admin/charts";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { computeStats } from "@/lib/booking/stats";
import { formatXof } from "@/lib/booking/money";
import { addDays, shortDate, todayLocal } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

export default async function Statistiques({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  await requireUser("stats");
  const sp = await searchParams;
  const today = todayLocal();
  const P: Record<string, [string, string, string]> = {
    "7j": ["7 jours", addDays(today, -6), today], "30j": ["30 jours", addDays(today, -29), today], "90j": ["90 jours", addDays(today, -89), today],
    mois: ["Ce mois", today.slice(0, 8) + "01", today], annee: ["Cette année", today.slice(0, 5) + "01-01", today],
  };
  const custom = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "");
  const key = custom ? "perso" : sp.p && P[sp.p] ? sp.p : "30j";
  const [, from, to] = custom ? ["", sp.from!, sp.to!] : P[key];
  const s = await computeStats(await getStore(), from, to);
  const dayData = s.parJour.length > 62
    ? (() => { const m = new Map<string, number>(); for (const d of s.parJour) m.set(d.date.slice(0, 7), (m.get(d.date.slice(0, 7)) ?? 0) + d.encaisse); return [...m.entries()].map(([label, value]) => ({ label, value })); })()
    : s.parJour.map((d) => ({ label: shortDate(d.date), value: d.encaisse }));
  return (
    <>
      <div className="adm__bar"><h1 className="bod adm__h1">Statistiques</h1><a className="btn btn--outline-prune btn--sm lb" href={`/api/admin/export?type=journal&format=xls&from=${from}&to=${to}`}>Journal des ventes (Excel)</a></div>
      <div className="adm__chips">{Object.entries(P).map(([k, [l]]) => <Link key={k} href={`/admin/statistiques?p=${k}`} className={key === k ? "is-on" : ""}>{l}</Link>)}</div>
      <form className="adm__form adm__form--inline adm__range"><label className="field"><span className="lb lb--s">Du</span><input type="date" name="from" defaultValue={from} /></label><label className="field"><span className="lb lb--s">au</span><input type="date" name="to" defaultValue={to} /></label><button className="btn btn--outline-prune btn--sm lb">Afficher</button></form>

      <div className="kpis">
        <Kpi label="Facturé" value={formatXof(s.facture)} sub={`${s.nbFactures} factures`} />
        <Kpi label="Encaissé" value={formatXof(s.encaisse)} />
        <Kpi label="Impayés" value={formatXof(s.impaye)} warn={s.impaye > 0} />
        <Kpi label="Panier moyen" value={formatXof(s.panier)} />
        <Kpi label="Rendez-vous" value={String(s.rdv)} sub={`${s.faits} réalisés`} />
        <Kpi label="Absences" value={`${s.tauxAbsence} %`} sub={`${s.absences} absente(s)`} warn={s.tauxAbsence >= 15} />
        <Kpi label="Annulations" value={`${s.tauxAnnulation} %`} sub={`${s.annules} annulé(s)`} />
        <Kpi label="Nouvelles clientes" value={String(s.nouvellesClientes)} sub={`${s.clientesFideles} fidèles (2 visites et +)`} />
      </div>

      <h2 className="bod adm__h2">Encaissements</h2>
      <BarChart title="Encaissements" money data={dayData} />
      <h2 className="bod adm__h2">Rendez-vous par jour</h2>
      <BarChart title="Rendez-vous par jour" data={s.parJour.map((d) => ({ label: shortDate(d.date), value: d.rdv }))} height={120} />

      <div className="adm__cols">
        <section><h2 className="bod adm__h2">Chiffre d&apos;affaires par univers</h2><Donut title="Par univers" money data={s.parCategorie} /></section>
        <section><h2 className="bod adm__h2">Modes de paiement</h2><Donut title="Paiements" money data={s.parMethode} /></section>
        <section><h2 className="bod adm__h2">D&apos;où viennent les réservations</h2><Donut title="Canaux" data={s.parCanal} /></section>
        <section><h2 className="bod adm__h2">Par employée</h2><HBars title="Par employée" money data={s.parEmploye} /></section>
        <section><h2 className="bod adm__h2">Prestations les plus vendues</h2><HBars title="Top prestations" money data={s.topPrestations.map((t) => ({ label: `${t.label} (${t.value})`, value: t.xof }))} /></section>
        <section><h2 className="bod adm__h2">Jours les plus chargés</h2><HBars title="Jours" data={s.parJourSemaine} /></section>
        <section className="adm__wide"><h2 className="bod adm__h2">Heures de pointe</h2><BarChart title="Heures" data={s.parHeure} height={110} /></section>
      </div>
    </>
  );
}
