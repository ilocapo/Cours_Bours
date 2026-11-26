import Link from "next/link";
import { BarChart, Kpi } from "@/components/admin/charts";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { processDue, toView } from "@/lib/booking/service";
import { computeStats } from "@/lib/booking/stats";
import { formatXof } from "@/lib/booking/money";
import { addDays, hhmm, isoToLocal, localToIso, longDate, shortDate, todayLocal } from "@/lib/booking/time";
import { METHOD_LABEL, SOURCE_LABEL } from "@/lib/booking/types";

export const dynamic = "force-dynamic";
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };

export default async function Today({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const store = await getStore();
  try { await processDue(); } catch { /* les envois en attente repartiront au prochain passage */ }
  const today = todayLocal();
  const nowIso = new Date().toISOString();
  const [bookingsAll, invoices, notifs, settings, staff] = await Promise.all([
    store.listBookings(localToIso(addDays(today, -30), 0), localToIso(addDays(today, 8), 0)), store.listInvoices(), store.listNotifications(), store.getSettings(), store.listStaff(),
  ]);
  const all = can(me.role, "agenda.all");
  const mine = bookingsAll.filter((b) => all || (me.staffId && b.staffId === me.staffId));
  const views = await Promise.all(mine.map((b) => toView(store, b)));
  const day = views.filter((b) => isoToLocal(b.startsAt).date === today && b.status !== "cancelled");
  const invoiced = new Set(invoices.filter((i) => i.status !== "void").map((i) => i.bookingId));
  // Prestations passées (faites ou à faire) sans facture : à clôturer.
  const toClose = views.filter((b) => !invoiced.has(b.id) && ((b.status === "confirmed" && b.endsAt < nowIso) || b.status === "done"));
  const upcoming = views.filter((b) => b.status === "confirmed" && b.startsAt >= nowIso && isoToLocal(b.startsAt).date !== today).slice(0, 6);
  const failed = notifs.filter((n) => n.status === "failed");
  const overdue = notifs.filter((n) => n.status === "pending" && n.sendAt < nowIso).length;
  const pending = notifs.filter((n) => n.status === "pending").length;
  const unpaid = invoices.filter((i) => (i.status === "due" || i.status === "partial"));
  const encaisseJour = invoices.filter((i) => i.paidAt && isoToLocal(i.paidAt).date === today && i.status !== "void").reduce((s, i) => s + i.paidXof, 0);
  const month = today.slice(0, 8) + "01";
  const stats = can(me.role, "stats") ? await computeStats(store, addDays(today, -13), today) : null;
  const monthStats = can(me.role, "stats") ? await computeStats(store, month, today) : null;
  const mailLive = !!process.env.RESEND_API_KEY;
  const cronAgo = settings.lastCronAt ? Math.round((Date.now() - new Date(settings.lastCronAt).getTime()) / 60000) : null;

  return (
    <>
      <p className="lb dim">{longDate(today)} · {me.name}</p>
      <h1 className="bod adm__h1">Aujourd&apos;hui</h1>
      {sp.refus && <p className="adm__warn" role="alert">Votre rôle n&apos;a pas accès à cette page.</p>}
      <Flash />

      {me.role === "comptable" ? (
        <>
          <div className="kpis">
            <Kpi label="Facturé ce mois" value={formatXof(monthStats!.facture)} sub={`${monthStats!.nbFactures} factures`} />
            <Kpi label="Encaissé ce mois" value={formatXof(monthStats!.encaisse)} />
            <Kpi label="Encaissé aujourd'hui" value={formatXof(encaisseJour)} />
            <Kpi label="Impayés (total)" value={formatXof(unpaid.reduce((s, i) => s + i.totalXof - i.paidXof, 0))} sub={`${unpaid.length} factures`} warn={unpaid.length > 0} />
          </div>
          <h2 className="bod adm__h2">Encaissements, 14 derniers jours</h2>
          <BarChart title="Encaissements par jour" money data={stats!.parJour.map((x) => ({ label: shortDate(x.date), value: x.encaisse }))} />
        </>
      ) : (
        <div className="kpis">
          <Kpi label="Rendez-vous aujourd'hui" value={String(day.length)} />
          <Kpi label="À clôturer" value={String(toClose.length)} sub="prestations faites, sans facture" warn={toClose.length > 0} />
          {can(me.role, "invoices.read") && <Kpi label="Encaissé aujourd'hui" value={formatXof(encaisseJour)} />}
          {can(me.role, "invoices.read") && <Kpi label="Impayés" value={formatXof(unpaid.reduce((s, i) => s + i.totalXof - i.paidXof, 0))} sub={`${unpaid.length} factures`} warn={unpaid.length > 0} />}
          {can(me.role, "notifications") && <Kpi label="E-mails en échec" value={String(failed.length)} warn={failed.length > 0} />}
        </div>
      )}

      {me.role !== "comptable" && (
        <>
          <h2 className="bod adm__h2">Planning du jour</h2>
          {day.length === 0 ? <p className="dim">Aucun rendez-vous aujourd&apos;hui.</p> : (
            <ul className="adm__list">{day.map((b) => (
              <li key={b.id}><Link href={`/admin/agenda?d=${today}&b=${b.id}`} className="adm__row">
                <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span>
                <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName}{b.staffName ? ` · ${b.staffName}` : " · non assignée"} · {SOURCE_LABEL[b.source]}</span></span>
                <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
              </Link></li>))}</ul>
          )}

          {toClose.length > 0 && (
            <>
              <h2 className="bod adm__h2">À clôturer et facturer</h2>
              <ul className="adm__list">{toClose.slice(0, 8).map((b) => (
                <li key={b.id}><Link href={`/admin/agenda?d=${isoToLocal(b.startsAt).date}&b=${b.id}`} className="adm__row">
                  <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span>
                  <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName} · {shortDate(isoToLocal(b.startsAt).date)}</span></span>
                  <span className="pill pill--pending">Facturer</span></Link></li>))}</ul>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <h2 className="bod adm__h2">Prochains jours</h2>
              <ul className="adm__list">{upcoming.map((b) => (
                <li key={b.id}><Link href={`/admin/agenda?d=${isoToLocal(b.startsAt).date}&b=${b.id}`} className="adm__row">
                  <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span>
                  <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName} · {longDate(isoToLocal(b.startsAt).date)}</span></span>
                  <span className={`pill pill--${b.status}`}>{b.staffName?.split(" ")[0] ?? "—"}</span></Link></li>))}</ul>
            </>
          )}
        </>
      )}

      {can(me.role, "invoices.read") && unpaid.length > 0 && (
        <>
          <h2 className="bod adm__h2">Factures à encaisser</h2>
          <ul className="adm__list">{unpaid.slice(0, 6).map((i) => (
            <li key={i.id}><Link href={`/admin/factures/${i.id}`} className="adm__row adm__row--wide"><span className="bod">{i.number}</span><span>{formatXof(i.totalXof - i.paidXof)} à encaisser</span><span className={`pill pill--${i.status === "partial" ? "pending" : "noshow"}`}>{i.status === "partial" ? "Partiel" : "À payer"}</span></Link></li>))}</ul>
        </>
      )}

      {can(me.role, "stats") && me.role !== "comptable" && stats && (
        <>
          <h2 className="bod adm__h2">Activité, 14 derniers jours</h2>
          <BarChart title="Rendez-vous par jour" data={stats.parJour.map((x) => ({ label: shortDate(x.date), value: x.rdv }))} />
          <Link className="lb link-plain" href="/admin/statistiques">Tous les indicateurs</Link>
        </>
      )}

      {can(me.role, "notifications") && (
        <div className="adm__status">
          <p><strong>E-mails</strong> · {mailLive ? "envoi réel actif (Resend)" : "mode test : les messages ne partent pas"}{failed.length ? ` · ${failed.length} en échec` : ""}</p>
          <p><strong>Rappels automatiques</strong> · {cronAgo === null ? "tâche planifiée jamais exécutée" : `dernière exécution il y a ${cronAgo} min`} · {pending} en attente{overdue ? `, ${overdue} en retard` : ""}</p>
          <p className="dim">{staff.filter((s) => s.active).length} personne(s) dans l&apos;équipe · mode de paiement : {Object.values(METHOD_LABEL).slice(0, 3).join(", ")}…</p>
        </div>
      )}

      <div className="adm__actions">
        {can(me.role, "bookings.manage") && <Link className="btn btn--prune btn--sm lb" href="/admin/reservations/nouvelle">Nouvelle réservation</Link>}
        <Link className="btn btn--outline-prune btn--sm lb" href="/admin/agenda">Ouvrir l&apos;agenda</Link>
      </div>
    </>
  );
}
