import type { Metadata } from "next";
import Arch from "@/components/Arch";
import Chrome from "@/components/Chrome";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import VideoBand from "@/components/VideoBand";
import Title from "@/components/Title";
import { photos } from "@/data/photos";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Galerie", description: "Le salon et nos réalisations : tresses, coiffures, soins et ongles." };

const prestations = [photos.bohemeDos, photos.boucles, photos.tressesSalon, photos.tressesDetail, photos.tresses, photos.nattes, photos.bohemeProfilSerre, photos.spa, photos.visage, photos.ongles, photos.ongles2];
const salon = [photos.salonVue, photos.salonMiroirs, photos.salonLavage, photos.salonPosteBleu, photos.salonCabine, photos.salonPostes, photos.salonMur];

export default function Page() {
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap">
          <Chrome left="Le travail" right="Et le salon" />
          <Title as="h1" initial lines={["Galerie"]} />
          <div className="work__grid" style={{ marginTop: 40 }}>
            {prestations.map((p) => (
              <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 45vw" />
            ))}
          </div>
        </div>
      </section>
      <VideoBand limit={6} tone="iv" chrome="Le geste" />
      <section className="sec sec--prune">
        <div className="wrap">
          <Chrome left="Le salon" right="Cotonou" />
          <div className="gallery-wide">
            {salon.map((p) => (
              <Arch key={p.src} src={p.src} alt={p.alt} ratio="4 / 3" sizes="(min-width: 768px) 45vw, 90vw" />
            ))}
          </div>
          <a className="link-line" href={site.instagramUrl} target="_blank" rel="noopener noreferrer"><span className="lb">Plus sur Instagram</span></a>
        </div>
      </section>
      <Contact photo={false} tone="iv" />
      <Footer />
    </>
  );
}
