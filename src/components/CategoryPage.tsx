import Arch from "./Arch";
import BookingButton from "./BookingButton";
import Chrome from "./Chrome";
import Contact from "./Contact";
import Footer from "./Footer";
import Pastille from "./Pastille";
import ServiceList from "./ServiceList";
import Title from "./Title";
import { categories } from "@/data/categories";
import { photos, type Photo } from "@/data/photos";

const gallery: Record<string, Photo[]> = {
  coiffure: [photos.bohemeDos, photos.boucles, photos.tressesSalon, photos.tressesDetail],
  spa: [photos.spa, photos.salonCabine, photos.salonPosteBleu],
  ongles: [photos.ongles2, photos.ongles2],
};
// Chaque page a sa propre photo d'ouverture.
const heroPhoto: Record<string, { photo: Photo; position: string; ratio: string }> = {
  coiffure: { photo: photos.tresses, position: "50% 30%", ratio: "4 / 5" },
  spa: { photo: photos.visage, position: "58% 40%", ratio: "4 / 5" },
  ongles: { photo: photos.ongles, position: "50% 30%", ratio: "4 / 5" },
};
const pictoBy: Record<string, string> = { coiffure: "tresse", spa: "goutte", ongles: "vernis" };
const num: Record<string, string> = { coiffure: "01", spa: "02", ongles: "03" };

export default function CategoryPage({ slug }: { slug: "coiffure" | "spa" | "ongles" }) {
  const cat = categories.find((c) => c.slug === slug)!;
  const hero = heroPhoto[slug];
  const list = gallery[slug].filter((p, i, a) => a.findIndex((x) => x.src === p.src) === i);
  return (
    <>
      <section className="sec sec--prune page-hero">
        <div className="wrap">
          <Chrome left={`${num[slug]} · Rituels`} right={cat.tagline} />
          <div className="page-hero__grid">
            <div>
              <Pastille name={pictoBy[slug]} tone="ivoire" />
              <Title as="h1" initial lines={[cat.name]} />
              <p data-fade>{cat.intro}</p>
              <div data-fade><BookingButton variant="ivoire">Réserver</BookingButton></div>
            </div>
            <Arch src={hero.photo.src} alt={hero.photo.alt} position={hero.position} ratio={hero.ratio} priority sizes="(min-width: 768px) 40vw, 88vw" />
          </div>
        </div>
      </section>

      <section className="sec sec--iv">
        <div className="wrap wrap--narrow">
          <Chrome left="Les rituels" right="Durées indicatives" />
          <Title lines={["Les rituels"]} className="block-title" />
          <ServiceList categoryId={cat.id} showTitle={false} />
          <div className="more"><BookingButton variant="prune">Réserver</BookingButton></div>
        </div>
      </section>

      <section className="sec sec--prune">
        <div className="wrap">
          <Chrome left="Le travail" right={cat.name} />
          <div className="work__grid work__grid--cat">
            {list.map((p) => (
              <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 44vw" />
            ))}
          </div>
        </div>
      </section>
      <Contact photo={false} tone="iv" />
      <Footer />
    </>
  );
}
