import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import ExportPanel from "@/components/admin/ExportPanel";
import { todayLocal } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Exports" };
export const dynamic = "force-dynamic";

const SETS = [
  { type: "factures", title: "Factures et paiements", desc: "Numéro, date, cliente, prestations, montants, mode de paiement, reste à payer. Pour la comptabilité." },
  { type: "journal", title: "Journal des ventes", desc: "Par jour : facturé, encaissé, nombre de rendez-vous, avec les totaux." },
  { type: "reservations", title: "Réservations", desc: "Date, prestation, employée, cliente, canal (site, Instagram, WhatsApp…), statut." },
  { type: "clients", title: "Clientes", desc: "Coordonnées, nombre de visites, total facturé, notes." },
];

export default async function Exports() {
  const me = await requireUser("exports");
  const today = todayLocal();
  const sets = SETS.filter((s) => s.type !== "reservations" || can(me.role, "bookings.manage") || me.role === "comptable");
  return (
    <>
      <h1 className="bod adm__h1">Exports</h1>
      <p className="dim">Fichiers CSV (s&apos;ouvrent dans Excel, séparateur « ; ») ou Excel (.xls). Choisissez la période, puis le format.</p>
      <ExportPanel sets={sets} today={today} monthStart={today.slice(0, 8) + "01"} />
    </>
  );
}
