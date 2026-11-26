"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";

// Un seul geste, repris partout : un panneau à bord en dôme (comme les sections) qui monte.
//  - à l'arrivée sur l'accueil (une fois par visite) : le logo dans son arche, puis le panneau se lève ;
//  - entre deux pages : le panneau recouvre la page, la page change, il se lève.
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

  // Arrivée sur la page / changement de route.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = document.documentElement;
    if (first.current) {
      first.current = false;
      if (html.classList.contains("intro")) {
        gsap.set(el, { yPercent: 0, visibility: "visible" });
        try { sessionStorage.setItem("zst-intro", "1"); } catch {}
        lift(1.3);
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

  // Clic sur un lien interne : on recouvre, puis on change de page.
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
      <span className="logo"><Image src="/logo/logo-zst.png" alt="" width={64} height={64} /></span>
    </div>
  );
}
