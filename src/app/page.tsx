import Image from "next/image";
import Link from "next/link";
import Arch from "@/components/Arch";
import BookingButton from "@/components/BookingButton";
import Footer from "@/components/Footer";
import Faq from "@/components/Faq";
import VideoBand from "@/components/VideoBand";
import Rating from "@/components/Rating";
import Picto from "@/components/Picto";
import ServiceList from "@/components/ServiceList";
import Title from "@/components/Title";
import Trait from "@/components/Trait";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";
import { site } from "@/data/site";

const work = [photos.bohemeDos, photos.boucles, photos.tressesSalon, photos.tressesDetail];

export default function Home() {
  return (
    <>
      {/* 1. Ouverture */}
      <section className="hero" >
        <div className="hero__bg">
          <Image src="/img/textures/ruban-noir.jpg" alt="" fill priority sizes="100vw" quality={70} />
        </div>
        <div className="wrap">
          <div className="lb hero__sub">Coiffure · Spa · Ongles</div>
          <Title as="h1" className="hero__title" lines={["Là où", "commence", "la beauté."]} />
          <Trait name="souligne" className="hero__trait" />
        </div>
        <div className="hero__foot">
          <div className="wrap">
            <BookingButton variant="ivoire">Réserver</BookingButton>
            <span className="scroll" aria-hidden="true"><i /><span className="lb">Défiler</span></span>
          </div>
        </div>
      </section>

      {/* 2. Le salon : l'arche qui s'ouvre */}
      <section className="open panel" id="salon" data-open>
        <div className="open__pin">
          <div className="open__intro wrap">
            <div className="lb dim">Le salon</div>
            <Title lines={["Un lieu où l'on", "prend le temps."]} />
            <p>Marbre, lumière douce et mains expertes : trois rituels sous un même toit, pour elle comme pour lui.</p>
          </div>
          <div className="open__arch arch">
            <div className="open__img">
              <Image src={photos.salonVue.src} alt={photos.salonVue.alt} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "50% 38%" }} />
            </div>
            <div className="open__veil" />
            <div className="open__slogan">
              <p className="bod title" style={{ margin: 0 }}>Là où commence la beauté.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Le geste : vidéos, juste après l'ouverture */}
      <VideoBand />

      {/* 3. Trois rituels */}
      <section className="sec sec--iv rituals panel" id="rituels">
        <div className="wrap">
          <div className="rituals__head">
            <span className="lb">Trois rituels</span>
            <Picto name="goutte" tone="prune" size={22} />
          </div>
          <Title lines={["Trois mains,", "une maison."]} />
          <div className="rituals__grid" data-fade>
            {categories.map((c) => (
              <Link href={`/${c.slug}`} className="ritual" key={c.id}>
                <Arch src={c.image} alt={`${c.name} chez ZST`} position={c.imagePosition} ratio="3 / 4.8" sizes="(min-width: 1280px) 30vw, 30vw" />
                <div className="bod ritual__name">{c.name}</div>
                <div className="lb ritual__tag">{c.tagline}</div>
              </Link>
            ))}
          </div>
          <div className="rituals__foot">
            <Trait name="fleuron" tone="prune" />
            <Link href="/carte" className="btn btn--prune lb">Voir la carte</Link>
          </div>
        </div>
      </section>

      {/* 4. La carte des rituels */}
      <section className="sec sec--prune menu panel" id="carte">
        <div className="wrap">
          <Title lines={["La carte", "des rituels"]} />
          <div className="menu__grid">
            <div className="menu__lists">
              {categories.map((c) => (
                <ServiceList key={c.id} categoryId={c.id} limit={c.slug === "coiffure" ? 2 : 1} />
              ))}
            </div>
            <Arch className="rise" src={photos.bohemeProfilSerre.src} alt={photos.bohemeProfilSerre.alt} ratio="3 / 4.6" sizes="(min-width: 1280px) 380px, (min-width: 768px) 280px, 112px" />
          </div>
          <Link href="/carte" className="link-under">
            <span className="lb">Toute la carte</span>
            <Trait name="souligne" />
          </Link>
        </div>
      </section>

      {/* 5. Le travail */}
      <section className="sec sec--iv work panel" id="travail">
        <div className="wrap">
          <div className="work__head">
            <span className="lb">Le travail</span>
            <a className="lb dim" href={site.instagramUrl} target="_blank" rel="noopener noreferrer">@{site.instagram}</a>
          </div>
          <Title lines={["Fait main,", "de près."]} />
          <div className="work__grid">
            {work.map((p) => (
              <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4.2" sizes="(min-width: 768px) 25vw, 45vw" />
            ))}
          </div>
          <div style={{ display: "flex", gap: 34, flexWrap: "wrap" }}>
            <Link className="link-under" href="/galerie"><span className="lb">Toute la galerie</span><Trait name="souligne" tone="prune" /></Link>
            <a className="link-under" href={site.instagramUrl} target="_blank" rel="noopener noreferrer">
              <span className="lb">Voir sur Instagram</span>
              <Trait name="souligne" tone="prune" />
            </a>
          </div>
        </div>
      </section>

      {/* Avis + questions */}
      <section className="sec sec--prune panel" id="avis">
        <div className="wrap faq-grid">
          <div>
            <div className="lb dim" style={{ marginBottom: 18 }}>Elles en parlent</div>
            <Rating />
          </div>
          <div>
            <Title lines={["Bon à savoir"]} className="block-title" />
            <Faq />
          </div>
        </div>
      </section>

      {/* 6. Nous trouver */}
      <Footer />
    </>
  );
}
