"use client";
import Image from "next/image";
import { useState } from "react";
import BookingButton from "./BookingButton";
import Pastille from "./Pastille";
import ServiceList from "./ServiceList";
import { categories } from "@/data/categories";

const picto: Record<string, string> = { coiffure: "tresse", spa: "goutte", ongles: "vernis" };
const tags: Record<string, string> = {
  coiffure: "Tresses · Soins · Femme, homme, enfant",
  spa: "Visage · Corps · Massage",
  ongles: "Manucure · Pédicure · Gel",
};

// Trois univers : un clic ouvre la carte de la catégorie (la photo s'efface), un second clic remet la photo.
export default function Rituals() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="bands">
      {categories.map((c) => {
        const isOpen = open === c.id;
        const tone = c.slug === "ongles" ? "iv" : "prune";
        return (
          <div key={c.id} className={`band band--${tone} band--acc ${isOpen ? "is-open" : ""}`} data-arch-band>
            <div className="band__media" aria-hidden="true">
              <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 70vw, 100vw" style={{ objectFit: "cover", objectPosition: c.imagePosition }} />
            </div>
            <button type="button" className="band__txt band__head" aria-expanded={isOpen} aria-controls={`panel-${c.slug}`} onClick={() => setOpen(isOpen ? null : c.id)}>
              <Pastille name={picto[c.slug]} tone={tone === "iv" ? "prune" : "ivoire"} />
              <h3 className="bod band__title">{c.name}</h3>
              <span className="lb lb--s band__tags">{tags[c.slug]}</span>
              <span className="band__plus bod" aria-hidden="true">{isOpen ? "–" : "+"}</span>
            </button>
            <div className="band__panel" id={`panel-${c.slug}`} role="region" aria-label={`Rituels ${c.name}`} inert={!isOpen}>
              <div className="band__panel-in">
                <div className="band__panel-body">
                  <ServiceList categoryId={c.id} showTitle={false} fade={false} />
                  <div className="band__cta">
                    <BookingButton variant={tone === "iv" ? "prune" : "ivoire"}>Réserver</BookingButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
