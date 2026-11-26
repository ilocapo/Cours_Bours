"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { homeNav, nav } from "@/data/nav";
import { photos } from "@/data/photos";
import { site } from "@/data/site";
import { todayHours } from "@/data/hours";
import { getLenis } from "@/lib/lenis";
import BookingButton, { bookingProps } from "./BookingButton";
import Monogram from "./Monogram";

// Une photo par lien (une photo fixe sur téléphone, elle change au toucher / au survol).
const menuPhoto: Record<string, { src: string; alt: string; position?: string }> = {
  "/coiffure": photos.nattes,
  "/spa": photos.soinCuir,
  "/ongles": photos.ongles,
  "/esthetique": photos.cabineBlanche,
  "/carte": photos.bohemeDos,
  "/galerie": photos.bouclesDos,
  "/a-propos": photos.salonVue,
  "/faq": photos.salonVue,
  "/#contact": photos.salonLogo,
};

const homePhoto: Record<string, { src: string; alt: string; position?: string }> = {
  "#accueil": photos.tresses, "#salon": photos.salonVue, "#rituels": photos.nattes,
  "#avis": photos.bouclesDos, "#travail": photos.boucles, "#contact": photos.salonLogo,
};

const fmt = (t: string | null) => (t ? t.replace(":", " h ").replace(" h 00", " h") : "");

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [photo, setPhoto] = useState<{ src: string; alt: string; position?: string }>(photos.salonVue);
  const [today, setToday] = useState<ReturnType<typeof todayHours> | null>(null);

  useEffect(() => {
    setToday(todayHours());
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    const lenis = getLenis();
    if (open) lenis?.stop(); else lenis?.start();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;
  const onHome = pathname === "/";
  const links = onHome ? homeNav : nav;
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
    }, 60);
  };
  const book = bookingProps();
  const show = (href: string) => setPhoto(menuPhoto[href] ?? homePhoto[href] ?? photos.salonVue);

  return (
    <header className={`head ${solid ? "head--solid" : ""}`}>
      <div className="head__in">
        <Link href="/" className="logo" aria-label="ZST Beauty Center, accueil" onClick={() => setOpen(false)}>
          <Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} priority />
        </Link>

        <nav className="head__nav" aria-label="Navigation principale">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className="lb head__link" onClick={(e) => goTo(e, n.href)}>{n.label}</Link>
          ))}
          <a className="btn btn--ivoire btn--sm lb" {...book}>Réserver</a>
        </nav>

        <button type="button" className="lb head__menu" aria-expanded={open} aria-controls="menu-overlay" onClick={() => setOpen((o) => !o)}>
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      <div id="menu-overlay" className={`overlay ${open ? "is-open" : ""}`} hidden={!open} data-lenis-prevent>
        <div className="overlay__body">
          <ul className="overlay__list">
            {links.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="bod overlay__link" onClick={(e) => goTo(e, n.href)}
                  onMouseEnter={() => show(n.href)} onFocus={() => show(n.href)} onTouchStart={() => show(n.href)}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="overlay__photo arch" aria-hidden="true">
            <Image key={photo.src} src={photo.src} alt="" fill sizes="(min-width: 768px) 30vw, 40vw" style={{ objectFit: "cover", objectPosition: photo.position ?? "center" }} />
          </div>
        </div>
        <div className="overlay__foot">
          <p className="lb">
            {today && today.open ? `Aujourd'hui · ${fmt(today.open)} – ${fmt(today.close)}` : "Horaires à venir"}
          </p>
          <p className="lb overlay__contact">
            {site.phone && <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>}
            {site.whatsapp && <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </p>
          <BookingButton variant="ivoire">Réserver un rituel</BookingButton>
          <div className="overlay__mono"><Monogram size={56} /></div>
        </div>
      </div>
    </header>
  );
}
