import type { Metadata } from "next";
import BookingFlow from "@/components/BookingFlow";
import Chrome from "@/components/Chrome";
import MonoArch from "@/components/MonoArch";
import Title from "@/components/Title";
import { ButtonLink } from "@/components/BookingButton";
import { categories } from "@/data/categories";
import { site } from "@/data/site";
import { getStore } from "@/lib/booking/store";
import { todayLocal } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Réserver", description: "Réserver un rituel chez ZST Beauty Center." };
export const dynamic = "force-dynamic";

const whatsappUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite réserver un rituel chez ZST Beauty Center.")}`;

export default async function Reserver({ searchParams }: { searchParams: Promise<{ rituel?: string }> }) {
  const internal = process.env.NEXT_PUBLIC_BOOKING_INTERNAL === "1";
  if (!internal) {
    return (
      <section className="sec sec--prune center-page">
        <div className="wrap stack" style={{ maxWidth: 720 }}>
          <MonoArch variant="pleine" tone="ivoire" size={84} />
          <Chrome left="Réservation" right="Bientôt en ligne" />
          <Title as="h1" initial lines={["La réservation", "en ligne arrive."]} />
          <p data-fade>En attendant, réservez par WhatsApp ou par téléphone au {site.phone}.</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a className="btn btn--ivoire btn--md lb" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Réserver sur WhatsApp</a>
            <ButtonLink href="/" variant="outline">Retour</ButtonLink>
          </div>
        </div>
      </section>
    );
  }
  const store = await getStore();
  const [services, staff, hours, settings] = await Promise.all([store.listServices(), store.listStaff(), store.getHours(), store.getSettings()]);
  const sp = await searchParams;
  return (
    <section className="sec sec--prune flowpage">
      <div className="wrap wrap--narrow">
        <Chrome left="Réservation" right="Fidjrossè · Cotonou" />
        <Title as="h1" initial accent={1} lines={["Réserver", "un rituel."]} />
        <BookingFlow
          categories={categories.map((c) => ({ id: c.id, name: c.name, picto: c.picto }))}
          services={services.filter((s) => s.active).map((s) => ({ id: s.id, categoryId: s.categoryId, name: s.name, durationMin: s.durationMin }))}
          staff={staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, categoryIds: s.categoryIds }))}
          closedWeekdays={hours.filter((h) => !h.opens || !h.closes).map((h) => h.weekday)}
          today={todayLocal()} maxDaysAhead={settings.maxDaysAhead} whatsappUrl={whatsappUrl} initialServiceId={sp.rituel}
        />
      </div>
    </section>
  );
}
