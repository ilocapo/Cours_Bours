import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { addDays, dayName, hhmm, isoToLocal, localToIso, todayLocal, weekStart } from "@/lib/booking/time";
import { dayState } from "@/lib/booking/staffday";
import { categories } from "@/data/categories";

export const metadata: Metadata = { title: "Équipe" };
export const dynamic = "force-dynamic";

export default async function Equipe() {
  await requireUser("team");
  const store = await getStore();
  let absences: Awaited<ReturnType<typeof store.listAbsences>> = [];
  let punches: Awaited<ReturnType<typeof store.listTimeEntries>> = [];
  const today = todayLocal();
  try { absences = await store.listAbsences(); punches = await store.listTimeEntries(localToIso(today, 0), localToIso(addDays(today, 1), 0)); } catch { /* migration 0003 */ }
  const [staff, hours, settings, bookings, services] = await Promise.all([store.listStaff(), store.getHours(), store.getSettings(), store.listBookings(localToIso(today, 0), localToIso(addDays(today, 7), 0)), store.listServices()]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));
  const active = staff.filter((s) => s.active);
  const skills = (s: (typeof staff)[number]) => s.serviceIds.length ? `${s.serviceIds.length} prestation(s)` : s.categoryIds.length ? s.categoryIds.map((c) => categories.find((x) => x.id === c)?.name).filter(Boolean).join(", ") : "Tous les univers";
  void services;
  return (
    <>
      <div className="adm__bar"><div><h1 className="bod adm__h1">Équipe</h1><p className="dim">Qui travaille quand, et qui fait quoi.</p></div>
        <Link className="btn btn--prune btn--sm lb" href="/admin/equipe/nouveau">+ Ajouter une personne</Link></div>

      <h2 className="bod adm__h2">Cette semaine</h2>
      {active.length === 0 ? <p className="dim">Aucune personne dans l&apos;équipe pour l&apos;instant. Ajoutez-en une : les créneaux du site tiendront compte de son planning.</p> : (
        <div className="plan" role="table" aria-label="Planning de la semaine">
          <div className="plan__row plan__row--head" role="row"><span />{days.map((d) => <span key={d} className={`plan__d ${d === today ? "is-today" : ""}`}><b>{dayName(d).slice(0, 3)}</b>{Number(d.slice(8))}</span>)}</div>
          {active.map((s) => (
            <div key={s.id} className="plan__row" role="row">
              <Link href={`/admin/equipe/${s.id}`} className="plan__who"><i className="dot" style={{ background: s.color }} />{s.name}</Link>
              {days.map((d) => { const st = dayState(s, d, hours, absences, settings.closures ?? []); return <span key={d} className={`plan__c plan__c--${st.kind} ${d === today ? "is-today" : ""}`}>{st.label}</span>; })}
            </div>
          ))}
        </div>
      )}
      <p className="lb lb--s dim">Pour changer un planning, ouvrez la personne ci-dessous. Les congés se déclarent dans « Congés ».</p>

      <h2 className="bod adm__h2">Les personnes</h2>
      <div className="people">
        {staff.map((s) => {
          const st = dayState(s, today, hours, absences, settings.closures ?? []);
          const p = punches.filter((t) => t.staffId === s.id).at(-1);
          const n = bookings.filter((b) => b.staffId === s.id && b.status === "confirmed").length;
          return (
            <Link key={s.id} href={`/admin/equipe/${s.id}`} className={`person ${s.active ? "" : "is-off"}`}>
              <span className="avatar" style={{ background: s.color }}>{s.name.charAt(0)}</span>
              <span className="person__txt"><strong>{s.name}{s.active ? "" : " (inactive)"}</strong><span className="dim">{skills(s)}</span>
                <span className="lb lb--s dim">{st.kind === "work" ? `Aujourd'hui ${st.label}` : `Aujourd'hui : ${st.label}`}{p ? ` · ${p.outAt ? "partie" : "pointée"} à ${hhmm(isoToLocal(p.outAt ?? p.inAt).minutes)}` : ""} · {n} rdv sur 7 jours</span></span>
              <span className="lb lb--s">Modifier →</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
