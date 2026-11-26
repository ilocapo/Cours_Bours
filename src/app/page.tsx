import Arch from "@/components/Arch";
import Band from "@/components/Band";
import BookingButton from "@/components/BookingButton";
import CategorySlider from "@/components/CategorySlider";
import Chrome from "@/components/Chrome";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import GalleryMore from "@/components/GalleryMore";
import Pastille from "@/components/Pastille";
import Quotes from "@/components/Quotes";
import Title from "@/components/Title";
import Trait from "@/components/Trait";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";
import { salonVideo, videos } from "@/data/videos";
import { site } from "@/data/site";

const sizesGal = "(min-width: 768px) 25vw, 44vw";

export default function Home() {
  return (
    <>
      {/* 1. Ouverture : titre en haut ; photo à gauche, carte prune à droite avec le bouton dedans */}
      <section className="hero sec--iv" id="accueil">
        <div className="wrap hero__in">
          <div className="hero__head">
            <Title as="h1" className="hero__title" initial lines={["Là où commence", "la beauté."]} />
            <Trait name="souligne" tone="prune" className="hero__trait" />
          </div>

          <Arch className="hero__arch" priority parallax={false} ratio="3 / 4.4" src={photos.tresses.src} alt={photos.tresses.alt} position="60% 24%" sizes="(min-width: 1024px) 42vw, 40vw" />

          <div className="hero__card" id="concept">
            <Title accent={1} className="hero__card-title" lines={["La maison qui", "prend le temps."]} />
            <p data-fade>
              ZST, c’est quatre univers : la coiffure (tresses, soins des cheveux crépus), le spa et les massages, les ongles,
              l’esthétique et le maquillage. Pour elle, pour lui, pour les enfants.
            </p>
            <div className="hero__pictos" data-fade>
              {categories.map((c) => <Pastille key={c.id} name={c.picto} tone="ivoire" />)}
            </div>
            <div className="hero__cta" data-fade><BookingButton variant="ivoire" size="sm">Réserver</BookingButton></div>
          </div>
        </div>
      </section>

      {/* 2. Le salon : un plan de la vidéo, voile sur le côté gauche */}
      <section className="sec sec--prune" id="salon">
        <div className="wrap">
          <Band tone="prune" size="lg" video={salonVideo}>
            <Title lines={["Un lieu où l'on", "prend le temps."]} />
            <p>Marbre, lumière douce et mains expertes : quatre univers sous un même toit, pour elle comme pour lui.</p>
          </Band>
        </div>
      </section>

      {/* 3. Quatre univers : diapositives en mosaïque d'arches, la carte s'ouvre au clic */}
      <section className="sec sec--iv" id="rituels">
        <div className="wrap">
          <Title lines={["Quatre univers,", "une maison."]} />
          <CategorySlider tone="iv" />
        </div>
      </section>

      {/* 4. Galerie : vidéo, photo, photo, vidéo */}
      <section className="sec sec--prune work" id="travail">
        <div className="wrap">
          <Title lines={["Fait main,", "de près."]} />
          <div className="work__grid work__grid--even">
            <Arch frame="pleine" src={photos.boucles.src} alt={photos.boucles.alt} ratio="3 / 4" sizes={sizesGal} />
            <Arch frame="pleine" video={videos[0]} src="" alt="" ratio="3 / 4" parallax={false} />
            <Arch frame="pleine" video={videos[1]} src="" alt="" ratio="3 / 4" parallax={false} />
            <Arch frame="pleine" src={photos.bouclesDos.src} alt={photos.bouclesDos.alt} position={photos.bouclesDos.position} ratio="3 / 4" sizes={sizesGal} />
          </div>
          <div className="more more--split">
            <a className="lb link-line" href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Voir sur Instagram</a>
            <GalleryMore />
          </div>
        </div>
      </section>

      {/* 5. Avis : une citation à la fois */}
      <section className="sec sec--iv" id="avis">
        <div className="wrap">
          <Chrome left="Elles en parlent" right="Avis Google" />
          <Quotes tone="iv" />
        </div>
      </section>

      {/* 6. Nous trouver */}
      <Contact tone="prune" />

      {/* 7. Pied de page */}
      <Footer />
    </>
  );
}
