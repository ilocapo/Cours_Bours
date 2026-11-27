"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavLink = { href: string; label: string };

// Onglets du bas sur téléphone : les pages les plus utilisées, selon ce que le rôle a le droit de voir.
const PRIORITY = ["/admin", "/admin/agenda", "/admin/pointage", "/admin/reservations", "/admin/moi", "/admin/clients", "/admin/factures"];

function isOn(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav({
  items, name, role, base, logout,
}: { items: NavLink[]; name: string; role: string; base: string; logout: () => void | Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuBtn.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tabs = PRIORITY.map((h) => items.find((i) => i.href === h)).filter((x): x is NavLink => !!x).slice(0, 4);
  const EXTRA: Record<string, string> = { "/admin/modeles": "E-mails", "/admin/profil": "Mon compte" };
  const current = items.find((i) => isOn(pathname, i.href));
  const title = current?.label ?? Object.entries(EXTRA).find(([h]) => isOn(pathname, h))?.[1] ?? "Gestion";

  return (
    <>
      {/* Ordinateur et tablette : menu latéral */}
      <aside className="adm__side">
        <Link href="/admin" className="logo" aria-label="Gestion ZST"><Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} /></Link>
        <nav className="adm__nav" aria-label="Gestion">
          {items.map((n) => <Link key={n.href} href={n.href} className="lb" aria-current={isOn(pathname, n.href) ? "page" : undefined}>{n.label}</Link>)}
        </nav>
        <div className="adm__side-foot">
          <p className="adm__who"><strong>{name}</strong><span className="lb lb--s dim">{role}</span></p>
          <p className="lb lb--s dim">{base}</p>
          <Link className="lb lb--s" href="/admin/profil">Mon mot de passe</Link>
          <Link className="lb lb--s" href="/" target="_blank">Voir le site</Link>
          <form action={logout}><button className="lb lb--s adm__link">Se déconnecter</button></form>
        </div>
      </aside>

      {/* Téléphone : barre du haut, onglets en bas, menu complet en tiroir */}
      <header className="adm__top">
        <Link href="/admin" className="logo" aria-label="Accueil de la gestion"><Image src="/logo/logo-zst.png" alt="ZST" width={34} height={34} /></Link>
        <p className="adm__top-title lb">{title}</p>
      </header>

      <nav className="adm__tabs" aria-label="Navigation rapide">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="adm__tab" aria-current={isOn(pathname, t.href) ? "page" : undefined}>{t.label}</Link>
        ))}
        <button ref={menuBtn} type="button" className="adm__tab" aria-expanded={open} aria-controls="adm-menu" onClick={() => setOpen((o) => !o)}>
          {open ? "Fermer" : "Menu"}
        </button>
      </nav>

      {open && (
        <div className="adm__menu" id="adm-menu" role="dialog" aria-modal="true" aria-label="Menu de la gestion">
          <p className="adm__who"><strong className="bod adm__menu-name">{name}</strong><span className="lb lb--s dim">{role}</span></p>
          <ul className="adm__menu-grid">
            {items.map((n) => (
              <li key={n.href}><Link href={n.href} className="adm__menu-link" aria-current={isOn(pathname, n.href) ? "page" : undefined}>{n.label}</Link></li>
            ))}
          </ul>
          <div className="adm__menu-foot">
            <Link className="lb lb--s" href="/admin/profil">Mon mot de passe</Link>
            <Link className="lb lb--s" href="/" target="_blank">Voir le site</Link>
            <form action={logout}><button className="lb lb--s adm__link">Se déconnecter</button></form>
          </div>
        </div>
      )}
    </>
  );
}
