import Link from "next/link";
import type { Metadata } from "next";
import BookingPanel from "@/components/admin/BookingPanel";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { addDays, dayName, hhmm, isoToLocal, localToIso, longDate, shortDate, todayLocal, weekStart } from "@/lib/booking/time";
import { toView } from "@/lib/booking/service";
import type { BookingView } from "@/lib/booking/types";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";
const ROW = 56;
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };

function lanes(list: BookingView[]): Map<string, { lane: number; of: number }> {
  const sorted = [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const res = new Map<string, { lane: number; of: number }>();
  let group: string[] = []; let ends: string[] = []; let groupEnd = "";
  const close = () => { for (const id of group) res.get(id)!.of = Math.max(1, ends.length); group = []; ends = []; };
  for (const b of sorted) {
    if (group.length && b.startsAt >= groupEnd) close();
    let l = ends.findIndex((e) => e <= b.startsAt);
    if (l < 0) { l = ends.length; ends.push(b.endsAt); } else ends[l] = b.endsAt;
    group.push(b.id); res.set(b.id, { lane: l, of: 1 });
    if (group.length === 1 || b.endsAt > groupEnd) groupEnd = b.endsAt;
  }
  close();
  return res;
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ d?: string; b?: string; e?: string; ok?: string; erreur?: string }> }) {
  const me = await requireUser(["agenda.all", "agenda.own"]);
  const sp = await searchParams;
  const all = can(me.role, "agenda.all");
  const d = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : todayLocal();
  const ws = weekStart(d);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const store = await getStore();
  const [hours, staff, invoices, raw] = await Promise.all([store.getHours(), store.listStaff(), store.listInvoices(), store.listBookings(localToIso(ws, 0), localToIso(addDays(ws, 7), 0))]);
  const filterStaff = all ? sp.e ?? "" : me.staffId ?? "none";
  const views = await Promise.all(raw.filter((b) => !filterStaff || b.staffId === filterStaff).map((b) => toView(store, b)));
  const open = hours.filter((h) => h.opens).map((h) => Number(h.opens!.slice(0, 2)));
  const close = hours.filter((h) => h.closes).map((h) => Math.ceil(Number(h.closes!.slice(0, 2)) + Number(h.closes!.slice(3, 5)) / 60));
  const gs = Math.min(8, ...(open.length ? open : [8])); const ge = Math.max(21, ...(close.length ? close : [21]));
  const rows = Array.from({ length: ge - gs }, (_, i) => gs + i);
  const shown = views.filter((b) => b.status !== "cancelled");
  const sel = sp.b ? views.find((b) => b.id === sp.b) ?? null : null;
  const q = (extra: Record<string, string>) => { const p = new URLSearchParams({ d, ...(all && sp.e ? { e: sp.e } : {}), ...extra }); return `/admin/agenda?${p}`; };
  const back = q(sp.b ? { b: sp.b } : {});
  const today = todayLocal();
  const colorOf = (id: string | null) => staff.find((s) => s.id === id)?.color ?? "#8C8C8C";

  return (
    <>
      <div className="adm__bar">
        <div><p className="lb dim">Semaine du {shortDate(ws)} au {shortDate(addDays(ws, 6))}</p><h1 className="bod adm__h1">Agenda</h1></div>
        <div className="adm__actions">
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: addDays(ws, -7) })} aria-label="Semaine précédente">←</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: today })}>Aujourd&apos;hui</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: addDays(ws, 7) })} aria-label="Semaine suivante">→</Link>
          {can(me.role, "bookings.manage") && <Link className="btn btn--prune btn--sm lb" href={`/admin/reservations/nouvelle?date=${d}`}>Nouvelle</Link>}
        </div>
      </div>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      {all && staff.some((s) => s.active) && (
        <div className="adm__chips" aria-label="Filtrer par employée">
          <Link href={`/admin/agenda?d=${d}`} className={!sp.e ? "is-on" : ""}>Toute l&apos;équipe</Link>
          {staff.filter((s) => s.active).map((s) => <Link key={s.id} href={`/admin/agenda?d=${d}&e=${s.id}`} className={sp.e === s.id ? "is-on" : ""}><i style={{ background: s.color }} />{s.name}</Link>)}
        </div>
      )}
      {!all && !me.staffId && <p className="adm__warn">Votre compte n&apos;est pas relié à une fiche de l&apos;équipe : demandez à la gérante de faire le lien (menu Comptes).</p>}

      <div className={`cal__wrap ${sel ? "has-sel" : ""}`}>
        <div className="cal" style={{ ["--row" as string]: `${ROW}px`, ["--rows" as string]: rows.length }}>
          <div className="cal__head"><span />{days.map((dd) => <Link key={dd} href={q({ d: dd })} className={`cal__dh ${dd === today ? "is-today" : ""}`}><span className="lb lb--s">{dayName(dd).slice(0, 3)}</span><span className="bod">{Number(dd.slice(8))}</span></Link>)}</div>
          <div className="cal__body">
            <div className="cal__axis">{rows.map((h) => <span key={h} className="lb lb--s">{h} h</span>)}</div>
            {days.map((dd) => {
              const list = shown.filter((b) => isoToLocal(b.startsAt).date === dd);
              const ln = lanes(list);
              return (
                <div key={dd} className={`cal__col ${dd === today ? "is-today" : ""}`}>
                  {list.map((b) => {
                    const st = isoToLocal(b.startsAt).minutes; const { lane, of } = ln.get(b.id)!;
                    return (
                      <Link key={b.id} href={q({ b: b.id })} className={`cal__ev cal__ev--${b.status} ${sel?.id === b.id ? "is-sel" : ""}`}
                        style={{ top: `${((st - gs * 60) / 60) * ROW}px`, height: `${Math.max(26, (b.durationMin / 60) * ROW - 2)}px`, left: `${(lane / of) * 100}%`, width: `calc(${100 / of}% - 3px)`, borderLeft: `4px solid ${colorOf(b.staffId)}` }}>
                        <span className="lb lb--s">{hhmm(st)}{b.staffName ? ` · ${b.staffName.split(" ")[0]}` : ""}</span><strong>{b.clientName}</strong><span>{b.serviceName}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cal__list">
          {days.map((dd) => {
            const list = shown.filter((b) => isoToLocal(b.startsAt).date === dd);
            return (
              <section key={dd}>
                <h2 className={`bod adm__h2 ${dd === today ? "is-today" : ""}`}>{longDate(dd)}</h2>
                {list.length === 0 ? <p className="dim lb lb--s">Rien de prévu</p> : (
                  <ul className="adm__list">{list.map((b) => (
                    <li key={b.id}><Link href={q({ b: b.id })} className="adm__row">
                      <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span><span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName}{b.staffName ? ` · ${b.staffName}` : ""}</span></span><span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
                    </Link></li>))}</ul>
                )}
              </section>
            );
          })}
        </div>

        {sel && <BookingPanel b={sel} invoice={invoices.find((i) => i.bookingId === sel.id) ?? null} staff={staff} me={me} back={back} closeHref={q({})} />}
      </div>
    </>
  );
}
