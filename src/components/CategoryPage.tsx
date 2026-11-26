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
  coiffure: [photos.bohemeDos, photos.nattes, photos.boucles, photos.bouclesDos],
  spa: [photos.cabineBlanche, photos.salonCabine, photos.salonPosteBleu],
  ongles: [photos.ongles2, photos.pedicure, photos.ongles],
  esthetique: [photos.cabineBlanche, photos.salonCabine, photos.salonPostes],
};
// Chaque page a sa propre photo d'ouverture.
const heroPhoto: Record<string, { photo: Photo; position: string; ratio: string }> = {
  coiffure: { photo: photos.bohemeDos, position: "50% 15%", ratio: "4 / 5" },
  spa: { photo: photos.soinCuir, position: "50% 40%", ratio: "4 / 5" },
  ongles: { photo: photos.ongles, position: "50% 35%", ratio: "4 / 5" },
  esthetique: { photo: photos.cabineBlanche, position: "30% 50%", ratio: "4 / 5" },
};
const num: Record<string, string> = { coiffure: "01", spa: "02", ongles: "03", esthetique: "04" };

export default function CategoryPage({ slug }: { slug: "coiffure" | "spa" | "ongles" | "esthetique" }) {
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
              <Pastille name={cat.picto} tone="ivoire" />
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
