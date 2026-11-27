"use client";
import { useState } from "react";
import Arch from "./Arch";
import { photos } from "@/data/photos";
import { videos } from "@/data/videos";

const sizes = "(min-width: 768px) 25vw, 44vw";
// Reste de la galerie : s'ouvre sur la page, se referme avec le même bouton.
export default function GalleryMore() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const extra = [photos.bohemeDos, photos.nattes, photos.pedicure, photos.ongles2, photos.soinCuir, photos.tressesDetail];
  return (
    <div className={`gmore ${open ? "is-open" : ""}`}>
      <button type="button" className="lb link-line gmore__btn" aria-expanded={open} aria-controls="gmore-panel" onClick={() => { setSeen(true); setOpen((o) => !o); }}>
        {open ? "Fermer la galerie" : "Toute la galerie"}
      </button>
      <div className="gmore__panel" id="gmore-panel" inert={!open}>
        <div className="gmore__in">
          {seen && <div className="work__grid work__grid--even gmore__slide">
            {extra.slice(0, 3).map((p) => <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4" sizes={sizes} reveal={false} />)}
            <Arch video={videos[2]} src="" alt="" ratio="3 / 4" parallax={false} reveal={false} />
            {extra.slice(3).map((p) => <Arch key={p.src} src={p.src} alt={p.alt} position={p.position} ratio="3 / 4" sizes={sizes} reveal={false} />)}
            <Arch video={videos[3]} src="" alt="" ratio="3 / 4" parallax={false} reveal={false} />
          </div>}
          <button type="button" className="lb link-line gmore__close" onClick={() => setOpen(false)}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
