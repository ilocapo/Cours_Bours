import type { Metadata } from "next";
import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import { longWhen } from "@/lib/booking/time";
import { runReminders } from "../../actions";

export const metadata: Metadata = { title: "Rappels" };
export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = { confirmation: "Confirmation", reminder_d1: "Rappel veille", reminder_h2: "Rappel avant RDV", salon_new: "Alerte salon : nouvelle", salon_cancel: "Alerte salon : annulation", thanks: "Remerciement" };
const ST: Record<string, string> = { pending: "En attente", sent: "Envoyé", failed: "Échec", skipped: "Ignoré" };

export default async function Notifications() {
  const store = await getStore();
  const list = (await store.listNotifications({ limit: 100 })).reverse();
  const rows = await Promise.all(list.map(async (n) => { const b = await store.getBooking(n.bookingId); return { n, v: b ? await toView(store, b) : null }; }));
  const pending = rows.filter((r) => r.n.status === "pending").length;
  return (
    <>
      <h1 className="bod adm__h1">Rappels et e-mails</h1>
      <p className="dim">La tâche planifiée appelle <code>/api/cron/reminders</code> toutes les 15 minutes et envoie ce qui est dû. {pending} message{pending > 1 ? "s" : ""} en attente.</p>
      <form action={runReminders}><button className="btn btn--prune btn--sm lb">Envoyer ce qui est dû maintenant</button></form>
      {rows.length === 0 ? <p className="dim">Aucun message pour l&apos;instant.</p> : (
        <div className="adm__table" role="table">
          {rows.map(({ n, v }) => (
            <div key={n.id} className="adm__trow" role="row">
              <span>{TYPE[n.type] ?? n.type}</span>
              <span>{v ? `${v.clientName} · ${longWhen(v.startsAt)}` : "—"}</span>
              <span className="dim">{longWhen(n.sendAt)}</span>
              <span className={`pill pill--${n.status}`}>{ST[n.status]}</span>
              {n.error && <span className="dim adm__err">{n.error}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
