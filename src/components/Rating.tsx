import { site } from "@/data/site";
import { reviews } from "@/data/reviews";

export default function Rating() {
  const { score, count } = site.googleRating;
  return (
    <div className="rating" data-fade>
      <div className="bod rating__score">{score.toString().replace(".", ",")}<span> / 5</span></div>
      <div className="lb dim">{count} avis sur Google</div>
      <a className="link-under" href={site.mapsUrl} target="_blank" rel="noopener noreferrer">
        <span className="lb">Lire les avis</span>
      </a>
      {reviews.length > 0 && (
        <ul className="rating__list">
          {reviews.map((r) => (
            <li key={r.id}><p className="bod">« {r.text} »</p><span className="lb lb--s dim">{r.author} · {r.source}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
