"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "@/lib/lenis";

gsap.registerPlugin(ScrollTrigger);

const REDUCED = "(prefers-reduced-motion: reduce)";

export default function Motion() {
  const pathname = usePathname();

  // Défilement fluide (Lenis), calme, sans effet élastique.
  useEffect(() => {
    if (window.matchMedia(REDUCED).matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // Animations de la page courante.
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Pendant l'ouverture (rideau), l'ouverture de l'accueil attend.
      const wait = document.documentElement.classList.contains("intro") ? 2.5 : 0;
      const q = <T extends Element = HTMLElement>(s: string) => gsap.utils.toArray<T>(s);

      // Titres : ligne par ligne, glissement léger + fondu.
      q("[data-title]").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll(".line-in"),
          { yPercent: 105, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: el.closest(".hero") ? wait : 0,
            scrollTrigger: { trigger: el, start: "top 90%", once: true } },
        );
      });

      // L'arche se remplit par le bas, comme un verre : le même geste pour toutes les photos en arche.
      const GROUPS = ".rituals__grid, .work__grid, .videos, .gallery-wide";
      q("[data-arch]").forEach((el) => {
        if (el.closest(GROUPS)) return;
        gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true } });
      });

      // En série : les arches d'une même grille se remplissent l'une après l'autre.
      q(GROUPS).forEach((grid) => {
        const arches = Array.from(grid.querySelectorAll("[data-arch]"));
        if (!arches.length) return;
        gsap.fromTo(arches, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power3.out", stagger: 0.18,
          scrollTrigger: { trigger: grid, start: "top 85%", once: true } });
      });

      // Vidéos : deux colonnes qui se croisent doucement.
      q(".video").forEach((el, i) => {
        gsap.fromTo(el, { y: i % 2 ? 60 : 0 }, { y: i % 2 ? -20 : -50, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });

      // Carte : les filets se tracent, les noms montent, rangée après rangée.
      q(".services").forEach((list) => {
        const rows = Array.from(list.querySelectorAll<HTMLElement>(".services__row"));
        gsap.fromTo(rows.map((r) => r.querySelectorAll(".services__name, .services__meta")), { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.09,
            scrollTrigger: { trigger: list, start: "top 88%", once: true } });
        ScrollTrigger.create({ trigger: list, start: "top 88%", once: true, onEnter: () => {
          rows.forEach((r, i) => { r.style.transitionDelay = `${i * 0.09}s`; r.classList.add("is-in"); });
        } });
      });

      // Avis : la note se compte jusqu'à sa valeur.
      q("[data-count]").forEach((el) => {
        const end = parseFloat(el.dataset.count || "0");
        const o = { v: 0 };
        gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = o.v.toFixed(1).replace(".", ","); },
          scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });

      // Apparitions douces.
      q("[data-fade]").forEach((el) => {
        gsap.fromTo(el, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true } });
      });

      // Traits plume : ils se dessinent de gauche à droite.
      q("[data-draw]").forEach((el) => {
        gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.4, ease: "power2.inOut",
          scrollTrigger: { trigger: el, start: "top 95%", once: true } });
      });

      // Photos : léger parallaxe interne (scale 1,1 → 1).
      q("[data-parallax]").forEach((el) => {
        const img = el.querySelector("img");
        if (!img) return;
        gsap.fromTo(img, { scale: 1.1 }, { scale: 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom 30%", scrub: true } });
      });

      // Arches qui montent doucement.
      q("[data-parallax].rise").forEach((el) => {
        gsap.fromTo(el, { yPercent: 14 }, { yPercent: 0, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 55%", scrub: true } });
      });

      // Pied de page : ZST géant qui remonte doucement.
      q("[data-zst]").forEach((el) => {
        gsap.fromTo(el, { yPercent: 35, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 105%", end: "bottom 85%", scrub: true } });
      });

      // Bandes : elles montent doucement, le voile se révèle avec elles.
      q("[data-arch-band]").forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, [pathname]);

  return null;
}
