import Link from "next/link";
import type { Metadata } from "next";
import { getStore } from "@/lib/booking/store";
import { addDays, dayName, hhmm, isoToLocal, localToIso, longDate, longWhen, shortDate, todayLocal, weekStart } from "@/lib/booking/time";
import { STATUS_LABEL, viewsBetween } from "@/lib/admin/view";
import { moveBooking, saveBookingNote, setStatus } from "../../actions";
import type { BookingView } from "@/lib/booking/types";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const ROW = 56; // px par heure

function lanes(list: BookingView[]): Map<string, { lane: number; of: number }> {
  // Les rendez-vous qui se chevauchent forment un groupe ; chaque groupe se partage la largeur de la colonne.
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

export default async function Agenda({ searchParams }: { searchParams: Promise<{ d?: string; b?: string }> }) {
  const sp = await searchParams;
  const d = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : todayLocal();
  const ws = weekStart(d);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const store = await getStore();
  const [hours, all] = await Promise.all([store.getHours(), viewsBetween(localToIso(ws, 0), localToIso(addDays(ws, 7), 0))]);
  const open = hours.filter((h) => h.opens).map((h) => Number(h.opens!.slice(0, 2)));
  const close = hours.filter((h) => h.closes).map((h) => Math.ceil(Number(h.closes!.slice(0, 2)) + Number(h.closes!.slice(3, 5)) / 60));
  const gs = Math.min(8, ...(open.length ? open : [8])); const ge = Math.max(21, ...(close.length ? close : [21]));
  const rows = Array.from({ length: ge - gs }, (_, i) => gs + i);
  const shown = all.filter((b) => b.status !== "cancelled");
  const sel = sp.b ? all.find((b) => b.id === sp.b) ?? null : null;
  const back = `/admin/agenda?d=${d}${sp.b ? `&b=${sp.b}` : ""}`;
  const today = todayLocal();
  const href = (dd: string) => `/admin/agenda?d=${dd}`;

  return (
    <>
      <div className="adm__bar">
        <div>
          <p className="lb dim">Semaine du {shortDate(ws)} au {shortDate(addDays(ws, 6))}</p>
          <h1 className="bod adm__h1">Agenda</h1>
        </div>
        <div className="adm__actions">
          <Link className="btn btn--outline-prune btn--sm lb" href={href(addDays(ws, -7))} aria-label="Semaine précédente">←</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={href(today)}>Aujourd&apos;hui</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={href(addDays(ws, 7))} aria-label="Semaine suivante">→</Link>
          <Link className="btn btn--prune btn--sm lb" href={`/admin/reservations/nouvelle?date=${d}`}>Nouvelle</Link>
        </div>
      </div>

      <div className={`cal__wrap ${sel ? "has-sel" : ""}`}>
        {/* Planning : grille hebdomadaire (écran large) */}
        <div className="cal" style={{ ["--row" as string]: `${ROW}px`, ["--rows" as string]: rows.length }}>
          <div className="cal__head"><span />{days.map((dd) => <Link key={dd} href={href(dd)} className={`cal__dh ${dd === today ? "is-today" : ""}`}><span className="lb lb--s">{dayName(dd).slice(0, 3)}</span><span className="bod">{Number(dd.slice(8))}</span></Link>)}</div>
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
                      <Link key={b.id} href={`/admin/agenda?d=${d}&b=${b.id}`} className={`cal__ev cal__ev--${b.status} ${sel?.id === b.id ? "is-sel" : ""}`}
                        style={{ top: `${((st - gs * 60) / 60) * ROW}px`, height: `${Math.max(26, (b.durationMin / 60) * ROW - 2)}px`, left: `${(lane / of) * 100}%`, width: `calc(${100 / of}% - 3px)` }}>
                        <span className="lb lb--s">{hhmm(st)}</span><strong>{b.clientName}</strong><span>{b.serviceName}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste par jour (téléphone) */}
        <div className="cal__list">
          {days.map((dd) => {
            const list = shown.filter((b) => isoToLocal(b.startsAt).date === dd);
            return (
              <section key={dd}>
                <h2 className={`bod adm__h2 ${dd === today ? "is-today" : ""}`}>{longDate(dd)}</h2>
                {list.length === 0 ? <p className="dim lb lb--s">Rien de prévu</p> : (
                  <ul className="adm__list">{list.map((b) => (
                    <li key={b.id}><Link href={`/admin/agenda?d=${d}&b=${b.id}`} className="adm__row">
                      <span className="bod">{hhmm(isoToLocal(b.startsAt).minutes)}</span><span><strong>{b.clientName}</strong><br /><span className="dim">{b.serviceName}</span></span><span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
                    </Link></li>))}</ul>
                )}
              </section>
            );
          })}
        </div>

        {sel && (
          <aside className="cal__panel" aria-label="Détail du rendez-vous">
            <div className="adm__bar"><h2 className="bod adm__h2">{sel.serviceName}</h2><Link className="lb lb--s" href={`/admin/agenda?d=${d}`}>Fermer</Link></div>
            <p>{longWhen(sel.startsAt)}<br /><span className="dim">{sel.durationMin} min{sel.staffName ? ` · ${sel.staffName}` : ""} · {sel.source === "site" ? "réservé sur le site" : "ajouté par le salon"}</span></p>
            <span className={`pill pill--${sel.status}`}>{STATUS_LABEL[sel.status]}</span>
            <p className="adm__client"><Link href={`/admin/clients/${sel.clientId}`}><strong>{sel.clientName}</strong></Link><br />
              <a href={`tel:${sel.clientPhone.replace(/\s/g, "")}`}>{sel.clientPhone}</a> · <a href={`https://wa.me/${sel.clientPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {sel.clientEmail && <><br /><a href={`mailto:${sel.clientEmail}`}>{sel.clientEmail}</a></>}</p>
            <div className="adm__actions">
              {sel.status !== "done" && <form action={setStatus}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="status" value="done" /><input type="hidden" name="back" value={back} /><button className="btn btn--prune btn--sm lb">Terminé</button></form>}
              {sel.status !== "noshow" && <form action={setStatus}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="status" value="noshow" /><input type="hidden" name="back" value={back} /><button className="btn btn--outline-prune btn--sm lb">Absente</button></form>}
              {sel.status !== "cancelled" ? <form action={setStatus}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="status" value="cancelled" /><input type="hidden" name="back" value={back} /><button className="btn btn--outline-prune btn--sm lb">Annuler</button></form>
                : <form action={setStatus}><input type="hidden" name="id" value={sel.id} /><input type="hidden" name="status" value="confirmed" /><input type="hidden" name="back" value={back} /><button className="btn btn--outline-prune btn--sm lb">Rétablir</button></form>}
            </div>
            <form action={moveBooking} className="adm__form adm__form--inline">
              <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="back" value={back} />
              <label className="field"><span className="lb lb--s">Déplacer au</span><input type="date" name="date" defaultValue={isoToLocal(sel.startsAt).date} required /></label>
              <label className="field"><span className="lb lb--s">à</span><input type="time" name="time" step={900} defaultValue={String(Math.floor(isoToLocal(sel.startsAt).minutes / 60)).padStart(2, "0") + ":" + String(isoToLocal(sel.startsAt).minutes % 60).padStart(2, "0")} required /></label>
              <button className="btn btn--outline-prune btn--sm lb">Déplacer</button>
            </form>
            <form action={saveBookingNote} className="adm__form">
              <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="back" value={back} />
              <label className="field"><span className="lb lb--s">Note</span><textarea name="note" rows={3} defaultValue={sel.note} /></label>
              <button className="btn btn--outline-prune btn--sm lb">Enregistrer la note</button>
            </form>
          </aside>
        )}
      </div>
    </>
  );
}
