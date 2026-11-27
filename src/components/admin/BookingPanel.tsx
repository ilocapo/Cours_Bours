import Link from "next/link";
import { assignStaff, createInvoiceAction, moveBooking, resendConfirmation, saveBookingNote, setStatus } from "@/app/admin/actions";
import { can } from "@/lib/admin/roles";
import type { Current } from "@/lib/admin/session";
import { formatXof } from "@/lib/booking/money";
import { isoToLocal, longWhen } from "@/lib/booking/time";
import { METHOD_LABEL, SOURCE_LABEL, type BookingView, type Invoice } from "@/lib/booking/types";
import type { Staff } from "@/data/staff";
import { formatPhone } from "@/lib/phone";

const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };

// Fiche d'un rendez-vous : l'essentiel d'abord (qui, quand, boutons), le reste dans des volets repliés.
export default function BookingPanel({ b, invoice, staff, me, back, closeHref }: { b: BookingView; invoice: Invoice | null; staff: Staff[]; me: Current; back: string; closeHref: string }) {
  const manage = can(me.role, "bookings.manage");
  const own = can(me.role, "bookings.own") && !!b.staffId && b.staffId === me.staffId;
  const touch = manage || own;
  const canInvoice = can(me.role, "invoices.write") && touch;
  const l = isoToLocal(b.startsAt);
  const hidden = (status: string) => (<><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="back" value={back} /></>);
  const person = staff.find((s) => s.id === b.staffId);
  return (
    <>
      <Link href={closeHref} className="sheetx__backdrop" aria-label="Fermer la fiche" />
      <aside className="sheetx" aria-label="Détail du rendez-vous">
        <div className="sheetx__grab" aria-hidden="true" />
        <div className="sheetx__head">
          <div>
            <p className="lb dim">{longWhen(b.startsAt)} · {b.durationMin} min</p>
            <h2 className="bod sheetx__title">{b.serviceName}</h2>
          </div>
          <Link className="sheetx__close" href={closeHref} aria-label="Fermer">×</Link>
        </div>

        <div className="sheetx__who">
          <span className="avatar" style={{ background: person?.color ?? "#8C8C8C" }} aria-hidden="true">{b.clientName.charAt(0)}</span>
          <div>
            {can(me.role, "clients") ? <Link href={`/admin/clients/${b.clientId}`}><strong>{b.clientName}</strong></Link> : <strong>{b.clientName}</strong>}
            <br /><span className="dim">{b.staffName ? `avec ${b.staffName}` : "non assignée"} · {SOURCE_LABEL[b.source]}</span>
          </div>
          <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
        </div>

        <div className="sheetx__contact">
          <a className="btn btn--outline-prune btn--sm lb" href={`tel:${b.clientPhone.replace(/\s/g, "")}`}>Appeler</a>
          <a className="btn btn--outline-prune btn--sm lb" href={`https://wa.me/${b.clientPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          {b.clientEmail && <a className="btn btn--outline-prune btn--sm lb" href={`mailto:${b.clientEmail}`}>E-mail</a>}
        </div>
        <p className="lb lb--s dim sheetx__tel">{formatPhone(b.clientPhone)}{b.clientEmail ? ` · ${b.clientEmail}` : ""}</p>
        {b.note && <p className="sheetx__note">« {b.note} »</p>}

        {touch && (
          <div className="sheetx__quick">
            {b.status !== "done" && <form action={setStatus}>{hidden("done")}<button className="btn btn--prune btn--sm lb">Terminé</button></form>}
            {b.status !== "noshow" && b.status !== "done" && <form action={setStatus}>{hidden("noshow")}<button className="btn btn--outline-prune btn--sm lb">Absente</button></form>}
            {b.status !== "cancelled" ? <form action={setStatus}>{hidden("cancelled")}<button className="btn btn--outline-prune btn--sm lb">Annuler</button></form>
              : manage && <form action={setStatus}>{hidden("confirmed")}<button className="btn btn--outline-prune btn--sm lb">Rétablir</button></form>}
          </div>
        )}

        {invoice ? (
          <div className="sheetx__box">
            <h3 className="bod adm__h3">Facture {invoice.number}</h3>
            <p>{formatXof(invoice.totalXof)} · {invoice.status === "paid" ? `réglée (${invoice.method ? METHOD_LABEL[invoice.method] : ""})` : invoice.status === "partial" ? `reste ${formatXof(invoice.totalXof - invoice.paidXof)}` : invoice.status === "void" ? "annulée" : "à régler"}</p>
            <Link className="btn btn--outline-prune btn--sm lb" href={`/admin/factures/${invoice.id}`}>Ouvrir la facture</Link>
          </div>
        ) : canInvoice && b.status !== "cancelled" && (
          <details className="sheetx__box" open={b.status === "done"}>
            <summary className="bod adm__h3">Facturer la prestation</summary>
            <form action={createInvoiceAction} className="adm__form">
              <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="back" value={back} />
              <label className="field"><span className="lb lb--s">Montant négocié (F CFA)</span><input name="amount" inputMode="numeric" placeholder="ex. 15 000" required /></label>
              <label className="field"><span className="lb lb--s">Mode de paiement</span><select name="method" defaultValue="especes">{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="check"><input type="checkbox" name="paid" defaultChecked /><span>Réglée maintenant</span></label>
              <input type="hidden" name="label" value={b.serviceName} />
              <div className="adm__actions">
                <button className="btn btn--prune btn--sm lb" name="intent" value="save">Enregistrer</button>
                {b.clientEmail ? <button className="btn btn--outline-prune btn--sm lb" name="intent" value="send">Enregistrer et envoyer</button> : <span className="lb lb--s dim">Pas d&apos;e-mail : impression seulement.</span>}
              </div>
            </form>
          </details>
        )}

        {manage && (
          <details className="sheetx__box">
            <summary className="bod adm__h3">Déplacer ou assigner</summary>
            <form action={moveBooking} className="adm__form">
              <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
              <div className="adm__grid">
                <label className="field"><span className="lb lb--s">Nouvelle date</span><input type="date" name="date" defaultValue={l.date} required /></label>
                <label className="field"><span className="lb lb--s">Heure</span><input type="time" name="time" step={900} defaultValue={`${String(Math.floor(l.minutes / 60)).padStart(2, "0")}:${String(l.minutes % 60).padStart(2, "0")}`} required /></label>
              </div>
              <button className="btn btn--outline-prune btn--sm lb">Déplacer</button>
            </form>
            <form action={assignStaff} className="adm__form">
              <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
              <label className="field"><span className="lb lb--s">Assignée à</span>
                <select name="staffId" defaultValue={b.staffId ?? ""}><option value="">Non assignée</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <button className="btn btn--outline-prune btn--sm lb">Assigner</button>
            </form>
          </details>
        )}

        {touch && (
          <details className="sheetx__box">
            <summary className="bod adm__h3">Note et e-mail</summary>
            <form action={saveBookingNote} className="adm__form">
              <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
              <label className="field"><span className="lb lb--s">Note sur ce rendez-vous</span><textarea name="note" rows={3} defaultValue={b.note} /></label>
              <button className="btn btn--outline-prune btn--sm lb">Enregistrer la note</button>
            </form>
            {b.clientEmail && b.status === "confirmed" && <form action={resendConfirmation}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} /><button className="btn btn--outline-prune btn--sm lb">Renvoyer l&apos;e-mail de confirmation</button></form>}
          </details>
        )}
      </aside>
    </>
  );
}
