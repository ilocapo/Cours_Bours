"use client";
import { useEffect, useRef } from "react";

// Vidéo sans son : rien n'est téléchargé avant que la section approche ; lecture seulement à l'écran.
// Mouvement réduit : l'image d'aperçu seule.
export default function LazyVideo({ src, poster, label, className = "" }: { src: string; poster?: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let loaded = false;
    const load = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loaded) { loaded = true; v.src = src; v.load(); }
    }, { rootMargin: "400px 0px" });
    const play = new IntersectionObserver(([e]) => {
      if (!loaded) return;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.35 });
    load.observe(v); play.observe(v);
    return () => { load.disconnect(); play.disconnect(); };
  }, [src]);
  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-label={label} />;
}
