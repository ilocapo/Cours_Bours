"use client";
import { useState } from "react";

export default function ReservationActions({ token, canCancel, status, remindersOn }: { token: string; canCancel: boolean; status: string; remindersOn: boolean }) {
  const [st, setSt] = useState(status);
  const [rem, setRem] = useState(remindersOn);
  const [busy, setBusy] = useState(false);
  async function post(path: string) { setBusy(true); const r = await fetch(`/api/bookings/${token}/${path}`, { method: "POST" }); setBusy(false); return r.ok; }
  return (
    <div className="flow__actions">
      {st === "cancelled" && <p className="dim" data-testid="cancelled">Ce rendez-vous est annulé.</p>}
      {canCancel && st === "confirmed" && (
        <button type="button" className="btn btn--outline btn--md lb" disabled={busy}
          onClick={async () => { if (confirm("Annuler ce rendez-vous ?") && (await post("cancel"))) setSt("cancelled"); }}>Annuler le rendez-vous</button>
      )}
      {st === "confirmed" && <a className="btn btn--outline btn--md lb" href={`/api/ics/${token}`}>Ajouter à mon agenda</a>}
      {rem && st === "confirmed" && <button type="button" className="lb link-plain" onClick={async () => { if (await post("reminders")) setRem(false); }}>Ne plus recevoir de rappels</button>}
      {!rem && <p className="lb lb--s dim">Rappels désactivés.</p>}
    </div>
  );
}
