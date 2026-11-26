import type { Metadata } from "next";
import Arch from "@/components/Arch";
import BookingButton from "@/components/BookingButton";
import Chrome from "@/components/Chrome";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Title from "@/components/Title";
import { photos } from "@/data/photos";
import { staff } from "@/data/staff";

export const metadata: Metadata = { title: "À propos", description: "ZST Beauty Center, salon de beauté à Fidjrossè, Cotonou." };

// Texte à valider avec le salon.
export default function Page() {
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap">
          <Chrome left="À propos" right="Fidjrossè · Cotonou" />
          <div className="page-hero__grid">
            <div>
              <Title as="h1" initial accent={1} lines={["La maison qui", "prend le temps."]} />
              <p data-fade>ZST Beauty Center est un salon de beauté à Fidjrossè, à Cotonou. Coiffure pour femmes, hommes et enfants, soins du visage et du corps, massages, manucure et pédicure : trois univers sous un même toit.</p>
              <p data-fade style={{ marginTop: 18 }}>Chaque rituel se prépare avec vous, sans précipitation.</p>
              <div data-fade><BookingButton variant="ivoire">Réserver</BookingButton></div>
            </div>
            <Arch src={photos.salonVue.src} alt={photos.salonVue.alt} ratio="4 / 5" position="50% 55%" priority sizes="(min-width: 768px) 40vw, 88vw" />
          </div>
        </div>
      </section>
      {staff.filter((s) => s.active).length > 0 && (
        <section className="sec sec--iv">
          <div className="wrap">
            <Chrome left="L'équipe" />
            <Title lines={["L'équipe"]} className="block-title" />
            <ul className="cards">{staff.filter((s) => s.active).map((s) => <li key={s.id} className="bod">{s.name}</li>)}</ul>
          </div>
        </section>
      )}
      <Contact photo={false} tone="iv" />
      <Footer />
    </>
  );
}
