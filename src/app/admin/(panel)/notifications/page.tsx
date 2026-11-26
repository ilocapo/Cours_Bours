import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import { longWhen } from "@/lib/booking/time";
import { runReminders, sendTestMailAction } from "../../actions";

export const metadata: Metadata = { title: "E-mails" };
export const dynamic = "force-dynamic";

const TYPE: Record<string, string> = { confirmation: "Confirmation", reminder_d1: "Rappel veille", reminder_h2: "Rappel avant RDV", salon_new: "Alerte salon : nouvelle", salon_cancel: "Alerte salon : annulation", thanks: "Remerciement" };
const ST: Record<string, string> = { pending: "En attente", sent: "Envoyé", failed: "Échec", skipped: "Ignoré" };

export default async function Notifications({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const me = await requireUser("notifications");
  const sp = await searchParams;
  const store = await getStore();
  const list = (await store.listNotifications({ limit: 100 })).reverse();
  const rows = await Promise.all(list.map(async (n) => { const b = await store.getBooking(n.bookingId); return { n, v: b ? await toView(store, b) : null }; }));
  const pending = rows.filter((r) => r.n.status === "pending").length;
  const live = !!process.env.RESEND_API_KEY;
  return (
    <>
      <h1 className="bod adm__h1">E-mails et rappels</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="dim">Envoi : <strong>{live ? "réel (Resend)" : "mode test, rien ne part"}</strong>. La tâche planifiée appelle <code>/api/cron/reminders</code> toutes les 15 minutes. {pending} message{pending > 1 ? "s" : ""} en attente.</p>
      <form action={sendTestMailAction} className="adm__form adm__form--inline">
        <label className="field"><span className="lb lb--s">Envoyer un e-mail de test à</span><input name="to" type="email" defaultValue={me.email.includes("@") ? me.email : ""} placeholder="vous@exemple.com" required /></label>
        <button className="btn btn--outline-prune btn--sm lb">Envoyer le test</button>
      </form>
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
