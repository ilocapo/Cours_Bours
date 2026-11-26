"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import Monogram from "./Monogram";

// Un seul geste, repris partout : un panneau à bord en dôme (comme les sections) qui monte.
//  - à l'arrivée sur l'accueil (une fois par visite) : écran noir sur le ruban de zeste, le monogramme ZST en carré,
//    puis le panneau se lève sur le site brun prune ;
//  - entre deux pages : le même panneau recouvre la page, la page change, il se lève.
export default function PageTransition() {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const busy = useRef(false);
  const first = useRef(true);
  const safety = useRef<number | null>(null);

  const lift = (delay = 0) => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      yPercent: -112, duration: 1, ease: "power3.inOut", delay,
      onComplete: () => {
        gsap.set(el, { yPercent: 112 });
        busy.current = false;
        document.documentElement.classList.remove("intro");
      },
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = document.documentElement;
    if (first.current) {
      first.current = false;
      if (html.classList.contains("intro")) {
        gsap.set(el, { yPercent: 0, visibility: "visible" });
        try { sessionStorage.setItem("zst-intro", "1"); } catch {}
        lift(1.9);
      } else {
        gsap.set(el, { yPercent: 112, visibility: "visible" });
      }
      return;
    }
    if (busy.current) {
      if (safety.current) window.clearTimeout(safety.current);
      lift(0.15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const a = (e.target as Element | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      if (busy.current) return;
      busy.current = true;
      gsap.to(el, {
        yPercent: 0, duration: 0.8, ease: "power3.inOut",
        onComplete: () => {
          router.push(url.pathname + url.search + url.hash);
          safety.current = window.setTimeout(() => lift(0), 3500);
        },
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div ref={ref} className="curtain" aria-hidden="true">
      <div className="curtain__mono"><Monogram size={132} /></div>
      <p className="lb curtain__cap">Là où commence la beauté.</p>
    </div>
  );
}
