import Link from "next/link";
import type { Metadata } from "next";
import BookingPanel from "@/components/admin/BookingPanel";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { addDays, dayName, hhmm, isoToLocal, localToIso, longDate, todayLocal, weekStart } from "@/lib/booking/time";
import { toView } from "@/lib/booking/service";
import { dayState } from "@/lib/booking/staffday";
import type { BookingView } from "@/lib/booking/types";
import type { Staff } from "@/data/staff";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";
const ROW = 64; // px par heure
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

type SP = { d?: string; v?: string; b?: string; e?: string; ok?: string; erreur?: string };

export default async function Agenda({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser(["agenda.all", "agenda.own"]);
  const sp = await searchParams;
  const all = can(me.role, "agenda.all");
  const d = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : todayLocal();
  const view = sp.v === "semaine" ? "semaine" : "jour";
  const today = todayLocal();
  const ws = weekStart(d);
  const from = view === "jour" ? d : ws; const to = view === "jour" ? addDays(d, 1) : addDays(ws, 7);

  const store = await getStore();
  let absences: Awaited<ReturnType<typeof store.listAbsences>> = [];
  try { absences = await store.listAbsences(); } catch { /* migration 0003 pas encore passée */ }
  const [hours, staffAll, invoices, raw, settings] = await Promise.all([store.getHours(), store.listStaff(), store.listInvoices(), store.listBookings(localToIso(from, 0), localToIso(to, 0)), store.getSettings()]);
  const staff = staffAll.filter((s) => s.active);
  const onlyMine = !all;
  const pick = onlyMine ? me.staffId ?? "none" : sp.e ?? "";
  const views = await Promise.all(raw.filter((b) => !pick || b.staffId === pick).map((b) => toView(store, b)));
  const shown = views.filter((b) => b.status !== "cancelled");
  const sel = sp.b ? views.find((b) => b.id === sp.b) ?? null : null;
  const q = (extra: Record<string, string>) => { const p = new URLSearchParams({ d, v: view, ...(all && sp.e ? { e: sp.e } : {}), ...extra }); return `/admin/agenda?${p}`; };
  const back = q(sp.b ? { b: sp.b } : {});
  const closures = settings.closures ?? [];

  const open = hours.filter((h) => h.opens).map((h) => Number(h.opens!.slice(0, 2)));
  const close = hours.filter((h) => h.closes).map((h) => Math.ceil(Number(h.closes!.slice(0, 2)) + Number(h.closes!.slice(3, 5)) / 60));
  const gs = Math.min(8, ...(open.length ? open : [8])); const ge = Math.max(20, ...(close.length ? close : [20]));
  const rows = Array.from({ length: ge - gs }, (_, i) => gs + i);

  // Colonnes de la vue Jour : une par personne en poste (ou celle choisie), plus « À assigner » s'il y en a.
  const cols: { key: string; label: string; staff: Staff | null }[] = pick && pick !== "none" ? [{ key: pick, label: staff.find((s) => s.id === pick)?.name ?? "—", staff: staff.find((s) => s.id === pick) ?? null }]
    : staff.map((s) => ({ key: s.id, label: s.name, staff: s }));
  if (!pick && (shown.some((b) => !b.staffId) || staff.length === 0)) cols.push({ key: "none", label: staff.length ? "À assigner" : "Rendez-vous", staff: null });
  const nowMin = isoToLocal(new Date().toISOString()).minutes;
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const stateOf = (s: Staff | null, date: string) => (s ? dayState(s, date, hours, absences, closures) : null);

  const card = (b: BookingView, extraClass = "") => (
    <Link key={b.id} href={q({ b: b.id })} className={`ev ev--${b.status} ${sel?.id === b.id ? "is-sel" : ""} ${extraClass}`} style={{ ["--c" as string]: staff.find((s) => s.id === b.staffId)?.color ?? "#8C8C8C" }}>
      <span className="ev__time">{hhmm(isoToLocal(b.startsAt).minutes)}–{hhmm(isoToLocal(b.endsAt).minutes)}</span>
      <strong className="ev__who">{b.clientName}</strong>
      <span className="ev__svc">{b.serviceName}</span>
      {b.status !== "confirmed" && <span className="ev__st">{STATUS_LABEL[b.status]}</span>}
    </Link>
  );

  const dateField = (
    <form className="agx__date" method="get">
      <input type="hidden" name="v" value={view} />{all && sp.e && <input type="hidden" name="e" value={sp.e} />}
      <label className="lb lb--s" htmlFor="agd">Aller à</label>
      <input id="agd" type="date" name="d" defaultValue={d} />
      <button className="btn btn--outline-prune btn--sm lb">Ok</button>
    </form>
  );

  return (
    <>
      <div className="agx__top">
        <div>
          <p className="lb dim">{view === "jour" ? (d === today ? "Aujourd'hui" : dayName(d)) : "Semaine"}</p>
          <h1 className="bod adm__h1">{view === "jour" ? longDate(d).replace(/ \d{4}$/, "") : `Du ${Number(ws.slice(8))} au ${longDate(addDays(ws, 6)).replace(/^\w+ /, "").replace(/ \d{4}$/, "")}`}</h1>
        </div>
        <div className="agx__nav">
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: addDays(d, view === "jour" ? -1 : -7) })} aria-label="Précédent">‹</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: today })}>Aujourd&apos;hui</Link>
          <Link className="btn btn--outline-prune btn--sm lb" href={q({ d: addDays(d, view === "jour" ? 1 : 7) })} aria-label="Suivant">›</Link>
        </div>
      </div>

      <div className="agx__bar">
        <div className="seg" role="tablist" aria-label="Affichage">
          <Link href={q({ v: "jour" })} className={view === "jour" ? "is-on" : ""} role="tab" aria-selected={view === "jour"}>Jour</Link>
          <Link href={q({ v: "semaine" })} className={view === "semaine" ? "is-on" : ""} role="tab" aria-selected={view === "semaine"}>Semaine</Link>
        </div>
        {dateField}
        {can(me.role, "bookings.manage") && <Link className="btn btn--prune btn--sm lb agx__add" href={`/admin/reservations/nouvelle?date=${d}`}>+ Réservation</Link>}
      </div>
      <Flash ok={sp.ok} erreur={sp.erreur} />

      {all && staff.length > 0 && (
        <div className="adm__chips" aria-label="Choisir une personne">
          <Link href={`/admin/agenda?d=${d}&v=${view}`} className={!sp.e ? "is-on" : ""}>Toute l&apos;équipe</Link>
          {staff.map((s) => { const st = dayState(s, d, hours, absences, closures); return (
            <Link key={s.id} href={`/admin/agenda?d=${d}&v=${view}&e=${s.id}`} className={sp.e === s.id ? "is-on" : ""}><i style={{ background: s.color }} />{s.name}{view === "jour" && st.kind !== "work" ? <small>{st.label}</small> : null}</Link>
          ); })}
        </div>
      )}
      {!all && !me.staffId && <p className="adm__warn">Votre compte n&apos;est pas relié à une fiche de l&apos;équipe : demandez à la gérante de faire le lien (menu Comptes).</p>}

      <div className={`agx ${sel ? "has-sel" : ""}`}>
        {view === "jour" ? (
          <>
            {/* Grande vue : une colonne par personne, heures à gauche */}
            <div className="grid" style={{ ["--row" as string]: `${ROW}px`, ["--rows" as string]: rows.length, ["--cols" as string]: cols.length }}>
              <div className="grid__head"><span />{cols.map((c) => { const st = stateOf(c.staff, d); return (
                <div key={c.key} className="grid__h"><span className="dot" style={{ background: c.staff?.color ?? "#8C8C8C" }} /><strong>{c.label}</strong>{st && <small className={`tag tag--${st.kind}`}>{st.label}</small>}</div>
              ); })}</div>
              <div className="grid__body">
                <div className="grid__axis">{rows.map((h) => <span key={h} className="lb lb--s">{h} h</span>)}</div>
                {cols.map((c) => {
                  const st = stateOf(c.staff, d);
                  const list = shown.filter((b) => (c.key === "none" ? !b.staffId : b.staffId === c.key));
                  const ln = lanes(list);
                  return (
                    <div key={c.key} className="grid__col">
                      {st && st.kind === "work" && <>
                        <div className="grid__off" style={{ top: 0, height: Math.max(0, ((st.start - gs * 60) / 60) * ROW) }} />
                        <div className="grid__off" style={{ top: ((st.end - gs * 60) / 60) * ROW, bottom: 0 }} />
                      </>}
                      {st && st.kind !== "work" && <div className="grid__off grid__off--all"><span className="lb">{st.label}</span></div>}
                      {(!st || st.kind === "work") && rows.flatMap((h) => [0, 30]).map((m, i) => {
                        const t = gs * 60 + i * 30;
                        return <Link key={i} className="grid__slot" style={{ top: (i * ROW) / 2, height: ROW / 2 }} aria-label={`Réserver à ${hhmm(t)}`} href={`/admin/reservations/nouvelle?date=${d}&time=${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}${c.staff ? `&staff=${c.staff.id}` : ""}`}><span>+</span></Link>;
                      })}
                      {d === today && nowMin >= gs * 60 && nowMin <= ge * 60 && <div className="grid__now" style={{ top: ((nowMin - gs * 60) / 60) * ROW }} />}
                      {list.map((b) => {
                        const st0 = isoToLocal(b.startsAt).minutes; const { lane, of } = ln.get(b.id)!;
                        return <div key={b.id} className="grid__ev" style={{ top: ((st0 - gs * 60) / 60) * ROW, height: Math.max(34, (b.durationMin / 60) * ROW - 3), left: `${(lane / of) * 100}%`, width: `calc(${100 / of}% - 4px)` }}>{card(b)}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Téléphone : une simple liste, dans l'ordre de la journée */}
            <div className="daylist">
              {shown.length === 0 ? <p className="agx__empty">Aucun rendez-vous ce jour-là.<br /><span className="dim">Touchez « + Réservation » pour en ajouter un.</span></p>
                : [...shown].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((b) => card(b, "ev--list"))}
              {(pick ? staff.filter((s) => s.id === pick) : staff).filter((s) => dayState(s, d, hours, absences, closures).kind !== "work").map((s) => <p key={s.id} className="lb dim"><i className="dot" style={{ background: s.color }} /> {s.name} : {dayState(s, d, hours, absences, closures).label}</p>)}
            </div>
          </>
        ) : (
          /* Semaine : un jour par colonne, les rendez-vous empilés dans l'ordre */
          <div className="weekx">
            {days.map((dd) => {
              const list = shown.filter((b) => isoToLocal(b.startsAt).date === dd).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
              const closed = closures.find((c) => c.date === dd);
              return (
                <section key={dd} className={`weekx__day ${dd === today ? "is-today" : ""}`}>
                  <Link href={q({ d: dd, v: "jour" })} className="weekx__h"><span className="lb lb--s">{dayName(dd).slice(0, 3)}</span><span className="bod">{Number(dd.slice(8))}</span><small>{closed ? closed.label : list.length ? `${list.length} rdv` : ""}</small></Link>
                  <div className="weekx__list">{list.map((b) => card(b, "ev--mini"))}{list.length === 0 && !closed && <p className="dim weekx__none">Libre</p>}</div>
                </section>
              );
            })}
          </div>
        )}

        {sel && <BookingPanel b={sel} invoice={invoices.find((i) => i.bookingId === sel.id) ?? null} staff={staffAll} me={me} back={back} closeHref={q({})} />}
      </div>
    </>
  );
}
