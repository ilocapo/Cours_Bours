import Image from "next/image";
import Link from "next/link";
import Arch from "@/components/Arch";
import Band from "@/components/Band";
import BookingButton, { ButtonLink } from "@/components/BookingButton";
import Chrome from "@/components/Chrome";
import Concept from "@/components/Concept";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Pastille from "@/components/Pastille";
import Picto from "@/components/Picto";
import Quotes from "@/components/Quotes";
import Seam from "@/components/Seam";
import ServiceList from "@/components/ServiceList";
import Title from "@/components/Title";
import Trait from "@/components/Trait";
import VideoBand from "@/components/VideoBand";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";
import { salonVideo } from "@/data/videos";
import { site } from "@/data/site";

const pictoByCat: Record<string, string> = { coiffure: "tresse", spa: "goutte", ongles: "vernis" };
const tags: Record<string, string> = {
  coiffure: "Tresses · Soins · Femme, homme, enfant",
  spa: "Visage · Corps · Massage",
  ongles: "Manucure · Pédicure · Gel",
};

export default function Home() {
  return (
    <>
      {/* 1. Ouverture (le noir et le monogramme sont dans le rideau d'arrivée) */}
      <section className="hero sec--prune" id="accueil">
        <div className="wrap hero__in">
          <div className="hero__txt">
            <div className="lb dim hero__sub">Coiffure · Spa · Ongles</div>
            <Title as="h1" className="hero__title" initial lines={["Là où", "commence", "la beauté."]} />
            <Trait name="souligne" className="hero__trait" />
          </div>
          <Arch className="hero__arch" priority ratio="4 / 5" src={photos.bohemeProfil.src} alt={photos.bohemeProfil.alt} position="50% 18%" sizes="(min-width: 1024px) 42vw, 88vw" />
          <div className="hero__cta">
            <BookingButton variant="ivoire">Réserver</BookingButton>
            <span className="scroll" aria-hidden="true"><i /><span className="lb">Défiler</span></span>
          </div>
        </div>
      </section>

      {/* Concept (planche 01 du brand book) */}
      <Concept />

      {/* 2. Le salon : un seul plan de la vidéo, voile ivoire vers la droite */}
      <section className="sec sec--prune" id="salon">
        <Seam tone="ivoire" />
        <div className="wrap">
          <Chrome left="02 · Le salon" right="Marbre · Lumière douce" />
          <Band tone="prune" size="lg" video={salonVideo}>
            <Title lines={["Un lieu où l'on", "prend le temps."]} />
            <p>Marbre, lumière douce et mains expertes : trois rituels sous un même toit, pour elle comme pour lui.</p>
          </Band>
        </div>
      </section>

      {/* 3. Trois univers : un voile par rituel */}
      <section className="sec sec--noir" id="rituels">
        <Seam tone="ivoire" />
        <div className="wrap">
          <Chrome left="03 · Trois univers" right="Un voile par rituel" />
          <Title lines={["Trois mains,", "une maison."]} />
          <div className="bands">
            {categories.map((c) => (
              <Band key={c.id} href={`/${c.slug}`} tone={c.slug === "ongles" ? "iv" : "prune"} image={{ src: c.image, alt: `${c.name} chez ZST`, position: c.imagePosition }}>
                <Pastille name={pictoByCat[c.slug]} tone={c.slug === "ongles" ? "prune" : "ivoire"} />
                <h3 className="bod band__title">{c.name}</h3>
                <span className="lb lb--s band__tags">{tags[c.slug]}</span>
              </Band>
            ))}
          </div>
          <div className="more"><ButtonLink href="/carte" variant="outline">Voir la carte</ButtonLink></div>
        </div>
      </section>

      {/* 4. Le geste : deux vidéos */}
      <VideoBand limit={2} />

      {/* 5. Extrait de la carte */}
      <section className="sec sec--prune" id="carte">
        <Seam tone="ivoire" />
        <div className="wrap">
          <Chrome left="05 · La carte" right="Durées" />
          <Title accent={1} lines={["La carte", "des rituels"]} />
          <div className="menu__grid">
            <div className="menu__lists">
              {categories.map((c) => (
                <ServiceList key={c.id} categoryId={c.id} limit={c.slug === "coiffure" ? 2 : 1} />
              ))}
            </div>
            <Arch className="rise" src={photos.bohemeDos.src} alt={photos.bohemeDos.alt} position="center 15%" ratio="3 / 4" sizes="(min-width: 1024px) 380px, 40vw" sticker={<span className="sticker"><Picto name="sablier" tone="ivoire" size={20} /><span className="bod">4 h</span><span className="lb lb--s">Tresses bohème</span></span>} />
          </div>
          <Link href="/carte" className="lb link-line">Toute la carte</Link>
        </div>
      </section>

      {/* 6. Galerie : quatre photos */}
      <section className="sec sec--iv work" id="travail">
        <Seam tone="prune" />
        <div className="wrap">
          <Chrome left="06 · Le travail" right={`@${site.instagram}`} />
          <Title lines={["Fait main,", "de près."]} />
          <div className="work__grid">
            <Arch frame="pleine" src={photos.boucles.src} alt={photos.boucles.alt} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 44vw" />
            <Arch frame="filet" tone="prune" src={photos.tressesDetail.src} alt={photos.tressesDetail.alt} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 44vw" />
            <Arch frame="fenetre" tone="prune" src={photos.ongles2.src} alt={photos.ongles2.alt} ratio="3 / 4.2" position="60% center" sizes="(min-width: 768px) 25vw, 44vw" />
            <Arch frame="legende" src={photos.tressesSalon.src} alt={photos.tressesSalon.alt} position={photos.tressesSalon.position} ratio="3 / 4.2" caption="tressé main." sizes="(min-width: 768px) 25vw, 44vw" />
          </div>
          <div className="more more--split">
            <a className="lb link-line" href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Voir sur Instagram</a>
            <Link className="lb link-plain" href="/galerie">Toute la galerie</Link>
          </div>
        </div>
      </section>

      {/* 7. Avis : une citation à la fois */}
      <section className="sec sec--prune" id="avis">
        <Seam tone="ivoire" />
        <div className="wrap">
          <Chrome left="07 · Elles en parlent" right="Avis Google" />
          <Quotes />
        </div>
      </section>

      {/* 8. Nous trouver */}
      <Contact />

      {/* 9. Pied de page : le grand ZST */}
      <Footer />
    </>
  );
}
