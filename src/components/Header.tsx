"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { homeNav, nav, salonNavHome, salonNavPages, universNav } from "@/data/nav";
import { photos } from "@/data/photos";
import { site } from "@/data/site";
import { todayHours } from "@/data/hours";
import { getLenis } from "@/lib/lenis";
import BookingButton, { bookingProps } from "./BookingButton";
import Picto from "./Picto";

const univPhoto: Record<string, { src: string; alt: string; position?: string }> = {
  "/coiffure": photos.nattes, "/spa": photos.soinCuir, "/ongles": photos.ongles, "/esthetique": photos.cabineBlanche,
};
const fmt = (t: string | null) => (t ? t.replace(":", " h ").replace(" h 00", " h") : "");

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [photo, setPhoto] = useState<{ src: string; alt: string; position?: string }>(photos.salonVue);
  const [today, setToday] = useState<ReturnType<typeof todayHours> | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToday(todayHours());
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Changement de page : le menu se referme.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    const lenis = getLenis();
    if (open) { lenis?.stop(); sheet.current?.querySelector<HTMLElement>("a, button")?.focus(); } else lenis?.start();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); }
      // Le focus reste dans le menu tant qu'il est ouvert.
      if (open && e.key === "Tab" && sheet.current) {
        const f = [...sheet.current.querySelectorAll<HTMLElement>("a[href], button")].concat(btn.current ? [btn.current] : []);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.classList.remove("menu-open"); };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;
  const onHome = pathname === "/";
  const links = onHome ? homeNav : nav;
  const salonLinks = onHome ? salonNavHome : salonNavPages;
  const book = bookingProps();

  // Sur l'accueil : défilement doux jusqu'à la section, menu refermé d'abord.
  const goTo = (e: React.MouseEvent, href: string) => {
    if (!onHome || !href.startsWith("#")) { setOpen(false); return; }
    e.preventDefault();
    const target = document.querySelector<HTMLElement>(href);
    setOpen(false);
    history.replaceState(null, "", href);
    window.setTimeout(() => {
      if (!target) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { offset: href === "#accueil" ? -200 : -64, duration: 1.4 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };
  const current = (href: string) => (href.startsWith("/") && !href.includes("#") && href !== "/" ? pathname === href : href === "/" ? pathname === "/" : false);

  return (
    <>
      <header className={`head ${solid ? "head--solid" : ""} ${open ? "head--open" : ""}`}>
        <div className="head__in">
          <Link href="/" className="logo" aria-label="ZST Beauty Center, accueil">
            <Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} priority />
          </Link>

          <nav className="head__nav" aria-label="Navigation principale">
            {links.map((n) => (
              <Link key={n.href} href={n.href} className="lb head__link" aria-current={current(n.href) ? "page" : undefined} onClick={(e) => goTo(e, n.href)}>{n.label}</Link>
            ))}
            <a className="btn btn--ivoire btn--sm lb" {...book}>Réserver</a>
          </nav>

          <button ref={btn} type="button" className="head__menu" aria-expanded={open} aria-controls="menu-sheet" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((o) => !o)}>
            <span className="lb">{open ? "Fermer" : "Menu"}</span>
            <span className="burger" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </header>

      {/* Le menu est hors de l'en-tête : un en-tête flouté ou transformé enfermerait un élément « fixed ». */}
      <div id="menu-sheet" ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label="Menu" hidden={!open} data-lenis-prevent>
        <div className="sheet__cols">
          <div className="sheet__groups">
            <section aria-labelledby="g-univers">
              <h2 className="lb dim sheet__h" id="g-univers">Nos univers</h2>
              <ul>
                {universNav.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="sheet__link sheet__link--big" aria-current={current(n.href) ? "page" : undefined}
                      onClick={() => setOpen(false)} onMouseEnter={() => setPhoto(univPhoto[n.href])} onFocus={() => setPhoto(univPhoto[n.href])}>
                      <Picto name={n.picto} tone="ivoire" size={22} /><span className="bod">{n.label}</span><i aria-hidden="true">→</i>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="g-salon">
              <h2 className="lb dim sheet__h" id="g-salon">{onHome ? "Sur cette page" : "Le salon"}</h2>
              <ul>
                {salonLinks.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="sheet__link" aria-current={current(n.href) ? "page" : undefined} onClick={(e) => goTo(e, n.href)}>
                      <span className="bod">{n.label}</span><i aria-hidden="true">→</i>
                    </Link>
                  </li>
                ))}
                {onHome && <li><Link href="/a-propos" className="sheet__link" onClick={() => setOpen(false)}><span className="bod">À propos</span><i aria-hidden="true">→</i></Link></li>}
                {onHome && <li><Link href="/faq" className="sheet__link" onClick={() => setOpen(false)}><span className="bod">Questions fréquentes</span><i aria-hidden="true">→</i></Link></li>}
              </ul>
            </section>
          </div>
          <div className="sheet__photo arch" aria-hidden="true">
            <Image key={photo.src} src={photo.src} alt="" fill sizes="30vw" style={{ objectFit: "cover", objectPosition: photo.position ?? "center" }} />
          </div>
        </div>
        <div className="sheet__foot">
          <BookingButton variant="ivoire" className="sheet__book">Réserver un rituel</BookingButton>
          <p className="lb sheet__info">
            {today && today.open ? `Aujourd'hui · ${fmt(today.open)} – ${fmt(today.close)}` : "Horaires à venir"}
          </p>
          <p className="lb sheet__info">
            {site.phone && <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>}
            {site.whatsapp && <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </p>
        </div>
      </div>
    </>
  );
}
