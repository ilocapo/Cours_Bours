import Link from "next/link";
import Arch from "@/components/Arch";
import Band from "@/components/Band";
import BookingButton from "@/components/BookingButton";
import Chrome from "@/components/Chrome";
import Concept from "@/components/Concept";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Quotes from "@/components/Quotes";
import CategorySlider from "@/components/CategorySlider";
import Title from "@/components/Title";
import Trait from "@/components/Trait";
import { photos } from "@/data/photos";
import { salonVideo, videos } from "@/data/videos";
import { site } from "@/data/site";

const sizesGal = "(min-width: 768px) 25vw, 44vw";

export default function Home() {
  return (
    <>
      {/* 1. Ouverture : titre sur ivoire, photo en arche à côté */}
      <section className="hero sec--iv" id="accueil">
        <div className="wrap hero__in">
          <div className="hero__txt">
            <Title as="h1" className="hero__title" initial lines={["Là où", "commence", "la beauté."]} />
            <Trait name="souligne" tone="prune" className="hero__trait" />
            <div className="hero__cta"><BookingButton variant="prune">Réserver</BookingButton></div>
          </div>
          <Arch className="hero__arch" priority ratio="4 / 5" src={photos.tresses.src} alt={photos.tresses.alt} position="50% 30%" sizes="(min-width: 1024px) 42vw, 88vw" />
        </div>
      </section>

      {/* Concept (planche 01 du brand book) */}
      <Concept />

      {/* 2. Le salon : un plan de la vidéo, voile ivoire vers la droite */}
      <section className="sec sec--iv" id="salon">
        <div className="wrap">
          <Band tone="iv" size="lg" video={salonVideo}>
            <Title lines={["Un lieu où l'on", "prend le temps."]} />
            <p>Marbre, lumière douce et mains expertes : trois rituels sous un même toit, pour elle comme pour lui.</p>
          </Band>
        </div>
      </section>

      {/* 3. Trois univers : diapositives en mosaïque d'arches (planche 10) */}
      <section className="sec sec--noir" id="rituels">
        <div className="wrap">
          <Title lines={["Trois mains,", "une maison."]} />
          <CategorySlider />
        </div>
      </section>

      {/* 4. Galerie : vidéo, photo, vidéo, photo */}
      <section className="sec sec--iv work" id="travail">
        <div className="wrap">
          <Title lines={["Fait main,", "de près."]} />
          <div className="work__grid">
            <Arch frame="pleine" video={videos[0]} src="" alt="" ratio="3 / 4.2" />
            <Arch frame="filet" src={photos.boucles.src} alt={photos.boucles.alt} ratio="3 / 4.2" sizes={sizesGal} />
            <Arch frame="fenetre" tone="prune" video={videos[1]} src="" alt="" ratio="3 / 4.2" />
            <Arch frame="legende" src={photos.bouclesDos.src} alt={photos.bouclesDos.alt} position={photos.bouclesDos.position} ratio="3 / 4.2" caption="tressé main." sizes={sizesGal} />
          </div>
          <div className="more more--split">
            <a className="lb link-line" href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Voir sur Instagram</a>
            <Link className="lb link-plain" href="/galerie">Toute la galerie</Link>
          </div>
        </div>
      </section>

      {/* 5. Avis : une citation à la fois */}
      <section className="sec sec--prune" id="avis">
        <div className="wrap">
          <Chrome left="Elles en parlent" right="Avis Google" />
          <Quotes />
        </div>
      </section>

      {/* 6. Nous trouver */}
      <Contact />

      {/* 7. Pied de page */}
      <Footer />
    </>
  );
}
