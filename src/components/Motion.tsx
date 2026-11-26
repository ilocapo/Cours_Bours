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
      const q = <T extends Element = HTMLElement>(s: string) => gsap.utils.toArray<T>(s);

      // Titres : ligne par ligne, glissement léger + fondu.
      q("[data-title]").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll(".line-in"),
          { yPercent: 105, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 90%", once: true } },
        );
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

      // L'arche qui s'ouvre.
      q("[data-open]").forEach((root) => {
        const arch = root.querySelector<HTMLElement>(".open__arch");
        const img = root.querySelector<HTMLElement>(".open__arch img");
        const intro = root.querySelector<HTMLElement>(".open__intro");
        const veil = root.querySelector<HTMLElement>(".open__veil");
        const slogan = root.querySelector<HTMLElement>(".open__slogan");
        if (!arch || !intro) return;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root, start: "top top", end: "+=130%", pin: root.querySelector(".open__pin") ?? true, scrub: 0.6, invalidateOnRefresh: true },
        });
        tl.to(intro, { opacity: 0, y: -50, duration: 0.3 }, 0)
          .fromTo(arch,
            { width: () => arch.offsetWidth, height: () => arch.offsetHeight, borderTopLeftRadius: () => arch.offsetWidth / 2, borderTopRightRadius: () => arch.offsetWidth / 2 },
            { width: () => window.innerWidth, height: () => root.clientHeight, borderTopLeftRadius: 0, borderTopRightRadius: 0, duration: 0.75 }, 0.05)
          .fromTo(img, { scale: 1.15 }, { scale: 1, duration: 0.75 }, 0.05)
          .to(veil, { opacity: 1, duration: 0.2 }, 0.65)
          .fromTo(slogan, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, 0.75)
          .to({}, { duration: 0.15 });
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
