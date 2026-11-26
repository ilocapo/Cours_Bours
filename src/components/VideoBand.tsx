"use client";
import { useEffect, useRef } from "react";
import { videos } from "@/data/videos";
import Title from "./Title";

function Clip({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <figure className="video" data-fade style={{ margin: 0 }}>
      <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label} />
    </figure>
  );
}

// Section masquée tant qu'aucune vidéo n'est listée dans src/data/videos.ts.
export default function VideoBand({ limit = 4 }: { limit?: number }) {
  const list = videos.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <section className="sec sec--noir panel" id="video">
      <div className="wrap">
        <div className="lb dim" style={{ marginBottom: 18 }}>Le geste</div>
        <Title lines={["Prendre", "le temps."]} />
        <div className="videos" style={{ marginTop: 48 }}>
          {list.map((v) => <Clip key={v.src} {...v} />)}
        </div>
      </div>
    </section>
  );
}
