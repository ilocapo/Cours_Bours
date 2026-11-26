"use client";
import { useState } from "react";
import { reviews } from "@/data/reviews";
import { site } from "@/data/site";
import { fr } from "@/lib/fr";

// Une citation à la fois, en grand (Bodoni italique). La note Google reste discrète.
export default function Quotes({ tone = "prune" }: { tone?: "prune" | "iv" }) {
  const [i, setI] = useState(0);
  const n = reviews.length;
  if (n === 0) return null;
  const r = reviews[i];
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const { score, count } = site.googleRating;
  return (
    <div className="quotes">
      <figure className="quotes__fig" key={r.id} aria-live="polite">
        <blockquote className="quotes__q">« {fr(r.text)} »</blockquote>
        <figcaption className="lb">{r.author} · avis {r.source}</figcaption>
      </figure>
      <div className="quotes__nav">
        <button type="button" className="quotes__btn quotes__btn--prev" onClick={() => go(-1)} aria-label="Avis précédent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tone === "iv" ? "/img/traits/fleche-prune.svg" : "/img/traits/fleche.svg"} alt="" width={44} height={16} />
        </button>
        <span className="lb" aria-hidden="true">{i + 1} / {n}</span>
        <button type="button" className="quotes__btn" onClick={() => go(1)} aria-label="Avis suivant">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tone === "iv" ? "/img/traits/fleche-prune.svg" : "/img/traits/fleche.svg"} alt="" width={44} height={16} />
        </button>
      </div>
      <a className="lb quotes__rate" href={site.mapsUrl} target="_blank" rel="noopener noreferrer">
        Google · {String(score).replace(".", ",")} / 5 · {count} avis
      </a>
    </div>
  );
}
