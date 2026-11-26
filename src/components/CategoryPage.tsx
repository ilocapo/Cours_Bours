import Arch from "./Arch";
import BookingButton from "./BookingButton";
import Footer from "./Footer";
import Picto from "./Picto";
import ServiceList from "./ServiceList";
import Title from "./Title";
import Trait from "./Trait";
import { categories } from "@/data/categories";
import { photos, type Photo } from "@/data/photos";

const gallery: Record<string, Photo[]> = {
  coiffure: [photos.bohemeDos, photos.boucles, photos.tressesSalon, photos.tressesDetail],
  spa: [photos.spa, photos.visage, photos.salonCabine],
  ongles: [photos.ongles, photos.ongles2],
};

export default function CategoryPage({ slug }: { slug: "coiffure" | "spa" | "ongles" }) {
  const cat = categories.find((c) => c.slug === slug)!;
  const hero = slug === "spa" ? photos.salonCabine : slug === "ongles" ? photos.ongles : photos.bohemeProfilSerre;
  const heroPos = slug === "spa" ? "40% center" : "center";
  const list = gallery[slug];
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap page-hero__grid">
          <div>
            <div className="lb dim" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Picto name={cat.picto} size={22} /> {cat.tagline}
            </div>
            <Title as="h1" initial lines={[cat.name]} />
            <p data-fade>{cat.intro}</p>
            <div data-fade><BookingButton variant="ivoire">Réserver</BookingButton></div>
          </div>
          <Arch src={hero.src} alt={hero.alt} position={heroPos} ratio="3 / 4" priority sizes="(min-width: 768px) 40vw, 90vw" />
        </div>
      </section>

      <section className="sec sec--iv panel">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <Title lines={["Les rituels"]} className="block-title" />
          <ServiceList categoryId={cat.id} showTitle={false} />
          <p className="lb lb--s dim" style={{ marginTop: 18 }}>Carte d&apos;exemple, tarifs à venir.</p>
          <div className="stack" style={{ alignItems: "center", marginTop: 44 }}>
            <Trait name="fleuron" tone="prune" className="trait--fleuron" />
            <BookingButton variant="prune">Réserver</BookingButton>
          </div>
        </div>
      </section>

      <section className="sec sec--prune panel">
        <div className="wrap">
          <Title lines={["Le travail"]} className="block-title" />
          <div className="work__grid">
            {list.map((p) => (
              <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 45vw" />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
