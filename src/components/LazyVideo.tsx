"use client";
import { useEffect, useRef } from "react";

// Vidéo sans son : rien n'est téléchargé avant que la section approche ; lecture seulement à l'écran.
// Mouvement réduit : l'image d'aperçu seule.
export default function LazyVideo({ src, poster, label, className = "" }: { src: string; poster?: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // iOS : l'attribut seul ne suffit pas pour la lecture automatique
    v.defaultMuted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let loaded = false;
    const ensure = () => {
      if (loaded) return;
      loaded = true;
      v.src = src;
      v.load();
    };
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      if (e.isIntersecting) {
        ensure();
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { threshold: 0.25, rootMargin: "200px 0px" });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-label={label} />;
}
