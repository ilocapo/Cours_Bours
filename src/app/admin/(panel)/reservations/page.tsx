import Link from "next/link";
import type { Metadata } from "next";
import { addDays, hhmm, isoToLocal, longDate, todayLocal } from "@/lib/booking/time";
import { STATUS_LABEL, viewsBetween } from "@/lib/admin/view";

export const metadata: Metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";

export default async function Reservations({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const filter = sp.s ?? "a-venir";
  const today = todayLocal();
  const all = await viewsBetween("2000-01-01T00:00:00Z", "2100-01-01T00:00:00Z");
  const now = new Date().toISOString();
  let list = all;
  if (filter === "a-venir") list = all.filter((b) => b.endsAt >= now && b.status === "confirmed");
  else if (filter === "passees") list = all.filter((b) => b.endsAt < now).reverse();
  else if (filter === "annulees") list = all.filter((b) => b.status === "cancelled").reverse();
  void addDays;
  const tabs = [["a-venir", "À venir"], ["passees", "Passées"], ["annulees", "Annulées"], ["toutes", "Toutes"]];
  return (
    <>
      <div className="adm__bar"><h1 className="bod adm__h1">Réservations</h1><Link className="btn btn--prune btn--sm lb" href="/admin/reservations/nouvelle">Nouvelle</Link></div>
      <div className="slider__tabs lb">{tabs.map(([k, l]) => <Link key={k} href={`/admin/reservations?s=${k}`} className={filter === k ? "is-on" : ""} style={{ opacity: filter === k ? 1 : 0.55, borderBottom: filter === k ? "1px solid currentColor" : "1px solid transparent", padding: "10px 0" }}>{l}</Link>)}</div>
      {list.length === 0 ? <p className="dim">Aucune réservation.</p> : (
        <ul className="adm__list">
          {list.map((b) => {
            const l = isoToLocal(b.startsAt);
            return (
              <li key={b.id}><Link href={`/admin/agenda?d=${l.date}&b=${b.id}`} className="adm__row adm__row--wide">
                <span><span className="bod">{hhmm(l.minutes)}</span><br /><span className="lb lb--s dim">{l.date === today ? "Aujourd'hui" : longDate(l.date)}</span></span>
                <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName} · {b.clientPhone}</span></span>
                <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
              </Link></li>
            );
          })}
        </ul>
      )}
    </>
  );
}
