"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDays, dayName, longDate, shortDate, weekdayOf } from "@/lib/booking/time";
import { formatDuration, formatPrice } from "@/data/services";
import { COUNTRIES, checkNational } from "@/lib/phone";
import { checkEmail, checkName } from "@/lib/validate";

type Cat = { id: string; name: string; picto: string };
type Svc = { id: string; categoryId: string; name: string; durationMin: number; price: number | null };
type Person = { id: string; name: string; categoryIds: string[] };
type Slot = { minutes: number; label: string };

export type FlowProps = {
  categories: Cat[]; services: Svc[]; staff: Person[]; closedWeekdays: number[]; today: string; maxDaysAhead: number;
  whatsappUrl: string; initialServiceId?: string;
};

const STEPS = ["Rituel", "Date et heure", "Vos coordonnées"];

export default function BookingFlow(p: FlowProps) {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState(p.categories[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(p.initialServiceId ?? "");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [name, setName] = useState(""); const [dial, setDial] = useState("229"); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState(""); const [consent, setConsent] = useState(false); const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const svc = p.services.find((s) => s.id === serviceId);
  const nameCheck = checkName(name);
  const phoneCheck = checkNational(dial, phone);
  const emailCheck = email.trim() ? checkEmail(email) : null;
  const errName = touched.name && !nameCheck.ok ? nameCheck.error : "";
  const errPhone = touched.phone && !phoneCheck.ok ? phoneCheck.error : "";
  const errEmail = touched.email && emailCheck && !emailCheck.ok ? emailCheck.error : "";
  const formOk = nameCheck.ok && phoneCheck.ok && (!emailCheck || emailCheck.ok);
  const people = p.staff.filter((s) => !svc || s.categoryIds.length === 0 || s.categoryIds.includes(svc.categoryId));
  const days = useMemo(() => Array.from({ length: Math.min(p.maxDaysAhead, 21) }, (_, i) => addDays(p.today, i)), [p.today, p.maxDaysAhead]);

  useEffect(() => {
    if (!serviceId || !date) return;
    let live = true;
    setSlots(null); setMinutes(null);
    const q = new URLSearchParams({ serviceId, date, ...(staffId ? { staffId } : {}) });
    fetch(`/api/slots?${q}`).then((r) => r.json()).then((d) => { if (live) setSlots(d.slots ?? []); }).catch(() => { if (live) setSlots([]); });
    return () => { live = false; };
  }, [serviceId, date, staffId]);

  async function submit() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, date, minutes, staffId: staffId || null, name, phone: phoneCheck.ok ? phoneCheck.e164 : `+${dial}${phone}`, email, note, consentReminders: consent, website: trap }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Une erreur est survenue."); if (r.status === 409) { setStep(1); setMinutes(null); } }
      else setDone(d.token);
    } catch { setError("Connexion impossible. Réessayez ou écrivez-nous sur WhatsApp."); }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="flow__done" data-testid="booking-done">
        <h2 className="bod flow__h">C’est réservé.</h2>
        <p>{svc?.name}, {longDate(date)} à {slots?.find((s) => s.minutes === minutes)?.label}.</p>
        <p className="dim">{email ? "Un e-mail de confirmation vient de partir, avec le fichier pour votre agenda." : "Gardez ce lien pour voir ou annuler votre rendez-vous."}</p>
        <div className="flow__actions">
          <Link className="btn btn--ivoire btn--md lb" href={`/reservation/${done}`}>Voir mon rendez-vous</Link>
          <a className="btn btn--outline btn--md lb" href={`/api/ics/${done}`}>Ajouter à mon agenda</a>
        </div>
        <button type="button" className="lb link-plain flow__alt" onClick={() => { setDone(null); setStep(0); setServiceId(""); setDate(""); setMinutes(null); setSlots(null); }}>Réserver un autre rituel</button>
      </div>
    );
  }

  const canNext = step === 0 ? !!serviceId : step === 1 ? !!date && minutes !== null : formOk;

  return (
    <div className="flow">
      <ol className="flow__steps lb" aria-label="Étapes">
        {STEPS.map((s, i) => <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : ""}><span>0{i + 1}</span> {s}</li>)}
      </ol>

      {step === 0 && (
        <section aria-label="Choisir un rituel">
          <div className="slider__tabs lb" role="tablist">
            {p.categories.map((c) => <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cat === c.id ? "is-on" : ""} onClick={() => setCat(c.id)}>{c.name}</button>)}
          </div>
          <ul className="flow__list">
            {p.services.filter((s) => s.categoryId === cat).map((s) => (
              <li key={s.id}>
                <button type="button" className={`opt ${serviceId === s.id ? "is-on" : ""}`} aria-pressed={serviceId === s.id} onClick={() => { setServiceId(s.id); setStaffId(""); }}>
                  <span className="bod opt__name">{s.name}</span>
                  <span className="lb lb--s">{formatDuration(s.durationMin)}{formatPrice(s.price) ? ` · ${formatPrice(s.price)}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="lb lb--s dim flow__note">Un rituel par rendez-vous. Pour en réserver plusieurs, refaites une réservation après celle-ci.</p>
        </section>
      )}

      {step === 1 && (
        <section aria-label="Choisir la date et l'heure">
          <p className="lb dim flow__sum">{svc?.name} · {svc && formatDuration(svc.durationMin)}</p>
          <div className="flow__days" role="listbox" aria-label="Jour">
            {days.map((d) => {
              const closed = p.closedWeekdays.includes(weekdayOf(d));
              return (
                <button key={d} type="button" role="option" aria-selected={date === d} disabled={closed} className={`day ${date === d ? "is-on" : ""}`} onClick={() => setDate(d)}>
                  <span className="lb lb--s">{dayName(d).slice(0, 3)}</span>
                  <span className="bod day__n">{Number(d.slice(8))}</span>
                  <span className="lb lb--s">{shortDate(d).split(" ")[1]}</span>
                </button>
              );
            })}
          </div>
          {people.length > 0 && (
            <label className="field"><span className="lb lb--s">Avec qui (facultatif)</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Peu importe</option>{people.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
          )}
          {date && (
            <div className="flow__slots" aria-live="polite">
              {slots === null && <p className="dim">Chargement des horaires…</p>}
              {slots && slots.length === 0 && <p className="dim">Aucun créneau ce jour-là. Essayez un autre jour.</p>}
              {slots?.map((s) => <button key={s.minutes} type="button" className={`slot lb ${minutes === s.minutes ? "is-on" : ""}`} aria-pressed={minutes === s.minutes} onClick={() => setMinutes(s.minutes)}>{s.label}</button>)}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section aria-label="Vos coordonnées">
          <p className="lb dim flow__sum">{svc?.name} · {longDate(date)} à {slots?.find((s) => s.minutes === minutes)?.label}</p>
          <div className="flow__form">
            <label className="field"><span className="lb lb--s">Nom et prénom</span>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} aria-invalid={!!errName} aria-describedby="err-name" required />
              <span id="err-name" className="field__err" role="alert">{errName}</span></label>
            <div className="field"><span className="lb lb--s" id="lbl-phone">Téléphone</span>
              <div className="phone">
                <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Indicatif du pays">
                  {COUNTRIES.map((c) => <option key={c.dial} value={c.dial}>+{c.dial} {c.name}</option>)}
                </select>
                <input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} aria-labelledby="lbl-phone" aria-invalid={!!errPhone} aria-describedby="err-phone" placeholder={dial === "229" ? "97 00 00 00" : ""} required />
              </div>
              <span id="err-phone" className="field__err" role="alert">{errPhone}</span></div>
            <label className="field"><span className="lb lb--s">E-mail (pour la confirmation et les rappels)</span>
              <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} aria-invalid={!!errEmail} aria-describedby="err-email" />
              <span id="err-email" className="field__err" role="alert">{errEmail}</span></label>
            <label className="field"><span className="lb lb--s">Un mot pour le salon (facultatif)</span><textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
            <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={!emailCheck || !emailCheck.ok} />
              <span>Je souhaite recevoir un rappel par e-mail la veille et 2 h avant. Un lien de désinscription figure dans chaque message.{(!emailCheck || !emailCheck.ok) && " (Renseignez une adresse e-mail valide pour activer les rappels.)"}</span></label>
            <p className="dim flow__legal">Vos données servent uniquement à gérer ce rendez-vous. <Link href="/confidentialite">Confidentialité</Link>.</p>
          </div>
        </section>
      )}

      {error && <p className="flow__error" role="alert">{error}</p>}

      <div className="flow__nav">
        {step > 0 ? <button type="button" className="btn btn--outline btn--md lb" onClick={() => setStep(step - 1)}>Retour</button> : <span />}
        {step < 2
          ? <button type="button" className="btn btn--ivoire btn--md lb" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuer</button>
          : <button type="button" className="btn btn--ivoire btn--md lb" disabled={!canNext || busy} onClick={submit}>{busy ? "Envoi…" : "Confirmer"}</button>}
      </div>
      <a className="lb link-plain flow__alt" href={p.whatsappUrl} target="_blank" rel="noopener noreferrer">Plutôt par WhatsApp</a>
    </div>
  );
}
