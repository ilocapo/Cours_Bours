import { videos } from "@/data/videos";
import Chrome from "./Chrome";
import LazyVideo from "./LazyVideo";
import Seam from "./Seam";
import Title from "./Title";

// « Le geste » : deux vidéos au plus sur l'accueil (les plus nettes), toutes sur la galerie.
export default function VideoBand({ limit = 2, tone = "iv", chrome = "04 · Le geste" }: { limit?: number; tone?: "iv" | "prune"; chrome?: string }) {
  const list = videos.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <section className={`sec sec--${tone}`} id="video">
      <Seam tone={tone === "iv" ? "prune" : "ivoire"} />
      <div className="wrap">
        <Chrome left={chrome} right="Sans le son" />
        <Title lines={["Le geste,", "sans se presser."]} />
        <div className="videos">
          {list.map((v) => (
            <figure className="video" data-arch key={v.src}>
              <LazyVideo src={v.src} poster={v.poster} label={v.label} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
