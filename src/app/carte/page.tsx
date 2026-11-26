import type { Metadata } from "next";
import Arch from "@/components/Arch";
import BookingButton from "@/components/BookingButton";
import Chrome from "@/components/Chrome";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Pastille from "@/components/Pastille";
import ServiceList from "@/components/ServiceList";
import Title from "@/components/Title";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";

export const metadata: Metadata = { title: "La carte des rituels", description: "Coiffure, spa et ongles : tous les rituels et leurs durées." };
const pictoBy: Record<string, string> = { coiffure: "tresse", spa: "goutte", ongles: "vernis" };

export default function Carte() {
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap">
          <Chrome left="La carte" right="Coiffure · Spa · Ongles" />
          <div className="page-hero__grid">
            <div>
              <Title as="h1" initial accent={1} lines={["La carte", "des rituels"]} />
            </div>
            <Arch src={photos.salonPostes.src} alt={photos.salonPostes.alt} ratio="4 / 5" position="50% 40%" priority sizes="(min-width: 768px) 40vw, 88vw" />
          </div>
        </div>
      </section>
      <section className="sec sec--iv">
        <div className="wrap cards">
          {categories.map((c) => (
            <div key={c.id}>
              <div className="cards__head" data-fade>
                <Pastille name={pictoBy[c.slug]} tone="prune" />
                <h2 className="bod cards__title">{c.name}</h2>
              </div>
              <ServiceList categoryId={c.id} showTitle={false} />
            </div>
          ))}
        </div>
        <div className="wrap more" style={{ justifyContent: "center", display: "flex" }}>
          <BookingButton variant="prune">Réserver un rituel</BookingButton>
        </div>
      </section>
      <Contact photo={false} tone="prune" />
      <Footer />
    </>
  );
}
