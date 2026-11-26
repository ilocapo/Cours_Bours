"use client";
import { reviews } from "@/data/reviews";
import { site } from "@/data/site";
import { fr } from "@/lib/fr";

// Avis : cartes ivoire à bord haut en arche, texte prune, posées sur le fond sombre.
// Elles défilent horizontalement (glisser) ; la note Google reste discrète.
export default function Quotes() {
  if (reviews.length === 0) return null;
  const { score, count } = site.googleRating;
  return (
    <div className="quotes">
      <ul className="quotes__track" aria-label="Avis des clientes">
        {reviews.map((r) => (
          <li key={r.id} className="qcard">
            <span className="qcard__mark bod" aria-hidden="true">«</span>
            <blockquote className="qcard__q">{fr(r.text)}</blockquote>
            <p className="lb qcard__by">{r.author}<span> · avis {r.source}</span></p>
          </li>
        ))}
      </ul>
      <a className="lb quotes__rate" href={site.mapsUrl} target="_blank" rel="noopener noreferrer">
        Google · {String(score).replace(".", ",")} / 5 · {count} avis
      </a>
    </div>
  );
}
