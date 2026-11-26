import { videos } from "@/data/videos";
import LazyVideo from "./LazyVideo";
import Title from "./Title";

// Vidéos en arche (galerie).
export default function VideoBand({ limit = 6, tone = "iv" }: { limit?: number; tone?: "iv" | "prune" }) {
  const list = videos.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <section className={`sec sec--${tone}`} id="video">
      <div className="wrap">
        <Title lines={["En mouvement"]} className="block-title" />
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
