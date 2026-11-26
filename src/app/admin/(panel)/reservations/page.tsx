import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { hhmm, isoToLocal, longDate, todayLocal } from "@/lib/booking/time";
import { viewsBetween } from "@/lib/admin/view";
import { formatPhone } from "@/lib/phone";
import { SOURCE_LABEL } from "@/lib/booking/types";

export const metadata: Metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };

export default async function Reservations({ searchParams }: { searchParams: Promise<{ s?: string; canal?: string }> }) {
  await requireUser("bookings.manage");
  const sp = await searchParams;
  const filter = sp.s ?? "a-venir";
  const today = todayLocal();
  const all = await viewsBetween("2000-01-01T00:00:00Z", "2100-01-01T00:00:00Z");
  const now = new Date().toISOString();
  let list = all;
  if (filter === "a-venir") list = all.filter((b) => b.endsAt >= now && b.status === "confirmed");
  else if (filter === "passees") list = all.filter((b) => b.endsAt < now).reverse();
  else if (filter === "annulees") list = all.filter((b) => b.status === "cancelled").reverse();
  if (sp.canal) list = list.filter((b) => b.source === sp.canal);
  const tabs = [["a-venir", "À venir"], ["passees", "Passées"], ["annulees", "Annulées"], ["toutes", "Toutes"]];
  return (
    <>
      <div className="adm__bar"><h1 className="bod adm__h1">Réservations</h1>
        <div className="adm__actions"><a className="btn btn--outline-prune btn--sm lb" href="/api/admin/export?type=reservations&format=csv">Export CSV</a><Link className="btn btn--prune btn--sm lb" href="/admin/reservations/nouvelle">Nouvelle</Link></div></div>
      <div className="adm__chips">{tabs.map(([k, l]) => <Link key={k} href={`/admin/reservations?s=${k}${sp.canal ? `&canal=${sp.canal}` : ""}`} className={filter === k ? "is-on" : ""}>{l}</Link>)}</div>
      <div className="adm__chips" aria-label="Canal">
        <Link href={`/admin/reservations?s=${filter}`} className={!sp.canal ? "is-on" : ""}>Tous les canaux</Link>
        {(["site", "instagram", "whatsapp", "telephone", "comptoir"] as const).map((c) => <Link key={c} href={`/admin/reservations?s=${filter}&canal=${c}`} className={sp.canal === c ? "is-on" : ""}>{SOURCE_LABEL[c]}</Link>)}
      </div>
      {list.length === 0 ? <p className="dim">Aucune réservation.</p> : (
        <ul className="adm__list">
          {list.map((b) => {
            const l = isoToLocal(b.startsAt);
            return (
              <li key={b.id}><Link href={`/admin/agenda?d=${l.date}&b=${b.id}`} className="adm__row adm__row--wide">
                <span><span className="bod">{hhmm(l.minutes)}</span><br /><span className="lb lb--s dim">{l.date === today ? "Aujourd'hui" : longDate(l.date)}</span></span>
                <span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName} · {formatPhone(b.clientPhone)} · {SOURCE_LABEL[b.source]}{b.staffName ? ` · ${b.staffName}` : ""}</span></span>
                <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
              </Link></li>
            );
          })}
        </ul>
      )}
    </>
  );
}
