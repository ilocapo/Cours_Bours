"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nav } from "@/data/nav";
import { getLenis } from "@/lib/lenis";
import { bookingProps } from "./BookingButton";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
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

  const book = bookingProps();

  return (
    <header className={`head ${solid ? "head--solid" : ""}`}>
      <div className="head__in">
        <Link href="/" className="logo" aria-label="ZST Beauty Center, accueil" onClick={() => setOpen(false)}>
          <Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} priority />
        </Link>

        <nav className="head__nav" aria-label="Navigation principale">
          {nav.filter((n) => n.label !== "Le salon").map((n) => (
            <Link key={n.href} href={n.href} className="lb head__link">{n.label}</Link>
          ))}
          <a className="btn btn--ivoire btn--sm lb" {...book}>Réserver</a>
        </nav>

        <button
          type="button"
          className="lb head__menu"
          aria-expanded={open}
          aria-controls="menu-overlay"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      <div id="menu-overlay" className={`overlay ${open ? "is-open" : ""}`} hidden={!open} data-lenis-prevent>
        <ul className="overlay__list">
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="bod overlay__link" onClick={() => setOpen(false)}>{n.label}</Link>
            </li>
          ))}
        </ul>
        <a className="btn btn--ivoire lb" {...book} onClick={() => setOpen(false)}>Réserver un rituel</a>
      </div>
    </header>
  );
}
