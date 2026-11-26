import type { Metadata } from "next";
import Arch from "@/components/Arch";
import BookingButton from "@/components/BookingButton";
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
        <div className="wrap page-hero__grid">
          <div>
            <div className="lb dim">À propos</div>
            <Title as="h1" initial lines={["Là où commence", "la beauté."]} />
            <p data-fade>ZST Beauty Center est un salon de beauté à Fidjrossè, à Cotonou. Coiffure pour femmes, hommes et enfants, soins du visage et du corps, massages, manucure et pédicure : trois univers sous un même toit.</p>
            <p data-fade style={{ marginTop: 14 }}>Chaque rituel se prépare avec vous, sans précipitation.</p>
            <div data-fade><BookingButton variant="ivoire">Réserver</BookingButton></div>
          </div>
          <Arch src={photos.salonMur.src} alt={photos.salonMur.alt} ratio="3 / 4" position="55% center" priority sizes="(min-width: 768px) 40vw, 90vw" />
        </div>
      </section>
      {staff.filter((s) => s.active).length > 0 && (
        <section className="sec sec--iv panel">
          <div className="wrap">
            <Title lines={["L'équipe"]} className="block-title" />
            <ul className="cards">{staff.filter((s) => s.active).map((s) => <li key={s.id} className="bod">{s.name}</li>)}</ul>
          </div>
        </section>
      )}
      <Footer />
    </>
  );
}
