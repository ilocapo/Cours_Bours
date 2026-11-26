"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import BookingButton from "./BookingButton";
import Picto from "./Picto";
import ServiceList from "./ServiceList";
import { categories } from "@/data/categories";
import { formatDuration, servicesByCategory } from "@/data/services";

const picto: Record<string, string> = { coiffure: "tresse", spa: "goutte", ongles: "vernis" };
const tags: Record<string, string> = {
  coiffure: "Tresses · Soins · Femme, homme, enfant",
  spa: "Visage · Corps · Massage",
  ongles: "Manucure · Pédicure · Gel",
};

// Planche 10 du brand book : une photo en arche, une arche à filet, une arche pleine.
// Les trois univers défilent comme des diapositives (glisser, flèches ou onglets).
export default function CategorySlider() {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const k = (n + categories.length) % categories.length;
    el.scrollTo({ left: k * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="slider">
      <div className="slider__tabs lb" role="tablist" aria-label="Choisir un univers">
        {categories.map((c, k) => (
          <button key={c.id} type="button" role="tab" aria-selected={i === k} className={i === k ? "is-on" : ""} onClick={() => go(k)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="slider__track" ref={track}>
        {categories.map((c, k) => {
          const first = servicesByCategory(c.id)[0];
          return (
            <section key={c.id} className="slide" role="group" aria-roledescription="diapositive" aria-label={`${k + 1} sur ${categories.length} : ${c.name}`}>
              <div className="slide__mosaic">
                <div className="slide__cell">
                  <div className="arch slide__photo">
                    <Image src={c.image} alt={`${c.name} chez ZST`} fill sizes="(min-width: 1024px) 34vw, 50vw" style={{ objectFit: "cover", objectPosition: c.imagePosition }} />
                  </div>
                </div>
                <div className="slide__filet">
                  <Picto name={picto[c.slug]} tone="ivoire" size={40} />
                  <h3 className="bod slide__name">{c.name}</h3>
                </div>
                <div className="slide__plein">
                  {first && (
                    <>
                      <span className="bod slide__stat">{formatDuration(first.durationMin)}</span>
                      <span className="lb lb--s">{first.name}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="slide__body">
                <p className="slide__intro">{c.intro}</p>
                <p className="lb lb--s dim slide__tags">{tags[c.slug]}</p>
                <ServiceList categoryId={c.id} showTitle={false} fade={false} />
                <div className="slide__cta"><BookingButton variant="ivoire">Réserver</BookingButton></div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="slider__nav">
        <button type="button" className="quotes__btn quotes__btn--prev" onClick={() => go(i - 1)} aria-label="Univers précédent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/traits/fleche.svg" alt="" width={44} height={16} />
        </button>
        <span className="lb" aria-hidden="true">{i + 1} / {categories.length}</span>
        <button type="button" className="quotes__btn" onClick={() => go(i + 1)} aria-label="Univers suivant">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/traits/fleche.svg" alt="" width={44} height={16} />
        </button>
      </div>
    </div>
  );
}
