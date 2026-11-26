import type { Metadata } from "next";
import BookingButton from "@/components/BookingButton";
import Footer from "@/components/Footer";
import Picto from "@/components/Picto";
import ServiceList from "@/components/ServiceList";
import Title from "@/components/Title";
import Arch from "@/components/Arch";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";

export const metadata: Metadata = { title: "La carte des rituels", description: "Coiffure, spa et ongles : tous les rituels et leurs durées." };

export default function Carte() {
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap page-hero__grid">
          <div>
            <div className="lb dim">Coiffure · Spa · Ongles</div>
            <Title as="h1" initial lines={["La carte", "des rituels"]} />
            <p data-fade>Carte d&apos;exemple. Les tarifs et durées définitifs arrivent bientôt.</p>
          </div>
          <Arch src={photos.bohemeProfilSerre.src} alt={photos.bohemeProfilSerre.alt} ratio="3 / 4" priority sizes="(min-width: 768px) 40vw, 90vw" />
        </div>
      </section>
      <section className="sec sec--prune"  style={{ paddingTop: 0 }}>
        <div className="wrap cards">
          {categories.map((c) => (
            <div key={c.id}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 6 }}>
                <Picto name={c.picto} size={26} />
                <h2 className="bod block-title" style={{ margin: 0, fontSize: 32 }}>{c.name}</h2>
              </div>
              <ServiceList categoryId={c.id} showTitle={false} />
            </div>
          ))}
        </div>
        <div className="wrap" style={{ marginTop: 56, display: "flex", justifyContent: "center" }}>
          <BookingButton variant="ivoire">Réserver un rituel</BookingButton>
        </div>
      </section>
      <Footer />
    </>
  );
}
