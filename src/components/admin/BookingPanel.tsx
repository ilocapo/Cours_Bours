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

// Détail d'un rendez-vous : cliente, équipe, déplacement, notes, clôture et facture.
export default function BookingPanel({ b, invoice, staff, me, back, closeHref }: { b: BookingView; invoice: Invoice | null; staff: Staff[]; me: Current; back: string; closeHref: string }) {
  const manage = can(me.role, "bookings.manage");
  const own = can(me.role, "bookings.own") && !!b.staffId && b.staffId === me.staffId;
  const touch = manage || own;
  const canInvoice = can(me.role, "invoices.write") && touch;
  const l = isoToLocal(b.startsAt);
  const hidden = (status: string) => (<><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="back" value={back} /></>);
  return (
    <aside className="cal__panel" aria-label="Détail du rendez-vous">
      <div className="adm__bar"><h2 className="bod adm__h2">{b.serviceName}</h2><Link className="lb lb--s" href={closeHref}>Fermer</Link></div>
      <p>{longWhen(b.startsAt)}<br /><span className="dim">{b.durationMin} min · {SOURCE_LABEL[b.source]}</span></p>
      <span className={`pill pill--${b.status}`}>{STATUS_LABEL[b.status]}</span>
      <p className="adm__client">
        {can(me.role, "clients") ? <Link href={`/admin/clients/${b.clientId}`}><strong>{b.clientName}</strong></Link> : <strong>{b.clientName}</strong>}<br />
        <a href={`tel:${b.clientPhone.replace(/\s/g, "")}`}>{formatPhone(b.clientPhone)}</a> · <a href={`https://wa.me/${b.clientPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        {b.clientEmail && <><br /><a href={`mailto:${b.clientEmail}`}>{b.clientEmail}</a></>}
      </p>

      {manage ? (
        <form action={assignStaff} className="adm__form adm__form--inline">
          <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
          <label className="field"><span className="lb lb--s">Assignée à</span>
            <select name="staffId" defaultValue={b.staffId ?? ""}><option value="">Non assignée</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <button className="btn btn--outline-prune btn--sm lb">Assigner</button>
        </form>
      ) : <p className="dim">Employée : {b.staffName ?? "non assignée"}</p>}

      {touch && (
        <div className="adm__actions">
          {b.status !== "done" && <form action={setStatus}>{hidden("done")}<button className="btn btn--prune btn--sm lb">Terminé</button></form>}
          {b.status !== "noshow" && <form action={setStatus}>{hidden("noshow")}<button className="btn btn--outline-prune btn--sm lb">Absente</button></form>}
          {b.status !== "cancelled" ? <form action={setStatus}>{hidden("cancelled")}<button className="btn btn--outline-prune btn--sm lb">Annuler</button></form>
            : manage && <form action={setStatus}>{hidden("confirmed")}<button className="btn btn--outline-prune btn--sm lb">Rétablir</button></form>}
          {b.clientEmail && b.status === "confirmed" && <form action={resendConfirmation}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} /><button className="btn btn--outline-prune btn--sm lb" title="Renvoyer l'e-mail de confirmation">Renvoyer l&apos;e-mail</button></form>}
        </div>
      )}

      {/* Facture : montant négocié, saisi à la clôture de la prestation */}
      {invoice ? (
        <div className="adm__inv">
          <h3 className="bod adm__h3">Facture {invoice.number}</h3>
          <p>{formatXof(invoice.totalXof)} · {invoice.status === "paid" ? `réglée (${invoice.method ? METHOD_LABEL[invoice.method] : ""})` : invoice.status === "partial" ? `reste ${formatXof(invoice.totalXof - invoice.paidXof)}` : invoice.status === "void" ? "annulée" : "à régler"}</p>
          <Link className="btn btn--outline-prune btn--sm lb" href={`/admin/factures/${invoice.id}`}>Ouvrir la facture</Link>
        </div>
      ) : canInvoice && b.status !== "cancelled" && (
        <form action={createInvoiceAction} className="adm__form adm__inv">
          <h3 className="bod adm__h3">Facturer la prestation</h3>
          <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="back" value={back} />
          <label className="field"><span className="lb lb--s">Montant négocié (F CFA)</span><input name="amount" inputMode="numeric" placeholder="ex. 15000" required /></label>
          <label className="field"><span className="lb lb--s">Libellé</span><input name="label" defaultValue={b.serviceName} /></label>
          <label className="field"><span className="lb lb--s">Mode de paiement</span><select name="method" defaultValue="especes">{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="check"><input type="checkbox" name="paid" defaultChecked /><span>Réglée maintenant</span></label>
          <label className="field"><span className="lb lb--s">Note (facultatif)</span><input name="note" /></label>
          <div className="adm__actions">
            <button className="btn btn--prune btn--sm lb" name="intent" value="save">Enregistrer</button>
            {b.clientEmail ? <button className="btn btn--outline-prune btn--sm lb" name="intent" value="send">Enregistrer et envoyer par e-mail</button> : <span className="lb lb--s dim">Pas d&apos;e-mail : impression seulement.</span>}
          </div>
        </form>
      )}

      {manage && (
        <form action={moveBooking} className="adm__form adm__form--inline">
          <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
          <label className="field"><span className="lb lb--s">Déplacer au</span><input type="date" name="date" defaultValue={l.date} required /></label>
          <label className="field"><span className="lb lb--s">à</span><input type="time" name="time" step={900} defaultValue={`${String(Math.floor(l.minutes / 60)).padStart(2, "0")}:${String(l.minutes % 60).padStart(2, "0")}`} required /></label>
          <button className="btn btn--outline-prune btn--sm lb">Déplacer</button>
        </form>
      )}
      {touch && (
        <form action={saveBookingNote} className="adm__form">
          <input type="hidden" name="id" value={b.id} /><input type="hidden" name="back" value={back} />
          <label className="field"><span className="lb lb--s">Note</span><textarea name="note" rows={3} defaultValue={b.note} /></label>
          <button className="btn btn--outline-prune btn--sm lb">Enregistrer la note</button>
        </form>
      )}
    </aside>
  );
}
