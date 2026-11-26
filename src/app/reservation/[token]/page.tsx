import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Chrome from "@/components/Chrome";
import ReservationActions from "@/components/ReservationActions";
import Title from "@/components/Title";
import { ButtonLink } from "@/components/BookingButton";
import { site } from "@/data/site";
import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import { formatDuration } from "@/data/services";
import { longWhen } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Votre rendez-vous", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Reservation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const b = await store.getBookingByToken(token);
  if (!b) notFound();
  const v = await toView(store, b);
  const client = await store.getClient(b.clientId);
  const future = new Date(b.startsAt).getTime() > Date.now();
  return (
    <section className="sec sec--prune center-page">
      <div className="wrap wrap--narrow stack">
        <Chrome left="Votre rendez-vous" right={b.status === "cancelled" ? "Annulé" : "Confirmé"} />
        <Title as="h1" initial lines={[v.serviceName]} />
        <p className="flow__big">{longWhen(v.startsAt)}</p>
        <p className="dim">{formatDuration(v.durationMin)} · {site.address}{site.addressNote ? ` (${site.addressNote})` : ""}</p>
        <ReservationActions token={token} canCancel={future} status={b.status} remindersOn={!!client?.consentReminders} />
        <p className="dim">Pour déplacer le rendez-vous, annulez-le puis réservez un nouveau créneau, ou écrivez-nous sur WhatsApp.</p>
        <div><ButtonLink href="/reserver" variant="outline">Nouvelle réservation</ButtonLink></div>
      </div>
    </section>
  );
}
