import Link from "next/link";
import { getStore } from "@/lib/booking/store";
import { addDays, hhmm, isoToLocal, localToIso, longDate, todayLocal } from "@/lib/booking/time";
import { STATUS_LABEL, viewsBetween } from "@/lib/admin/view";

export const dynamic = "force-dynamic";

export default async function Today() {
  const store = await getStore();
  const today = todayLocal();
  const [day, week, failed] = await Promise.all([
    viewsBetween(localToIso(today, 0), localToIso(addDays(today, 1), 0)),
    viewsBetween(localToIso(today, 0), localToIso(addDays(today, 7), 0)),
    store.listNotifications({ status: "failed" }),
  ]);
  const dayActive = day.filter((b) => b.status !== "cancelled");
  const weekActive = week.filter((b) => b.status === "confirmed");
  return (
    <>
      <p className="lb dim">{longDate(today)}</p>
      <h1 className="bod adm__h1">Aujourd&apos;hui</h1>
      <div className="adm__stats">
        <div className="adm__stat"><span className="bod">{dayActive.length}</span><span className="lb lb--s">rendez-vous aujourd&apos;hui</span></div>
        <div className="adm__stat"><span className="bod">{weekActive.length}</span><span className="lb lb--s">sur 7 jours</span></div>
        <div className={`adm__stat ${failed.length ? "is-warn" : ""}`}><span className="bod">{failed.length}</span><span className="lb lb--s">e-mails en échec</span></div>
      </div>
      <h2 className="bod adm__h2">À venir aujourd&apos;hui</h2>
      {dayActive.length === 0 ? <p className="dim">Aucun rendez-vous aujourd&apos;hui.</p> : (
        <ul className="adm__list">
          {dayActive.map((b) => (
            <li key={b.id}><Link href={`/admin/agenda?d=${today}&b=${b.id}`} className="adm__row">
              <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span>
              <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName}</span></span>
              <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
            </Link></li>
          ))}
        </ul>
      )}
      <div className="adm__actions"><Link className="btn btn--prune btn--sm lb" href="/admin/reservations/nouvelle">Nouvelle réservation</Link><Link className="btn btn--outline-prune btn--sm lb" href="/admin/agenda">Ouvrir l&apos;agenda</Link></div>
    </>
  );
}
