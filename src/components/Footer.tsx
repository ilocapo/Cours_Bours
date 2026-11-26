import Image from "next/image";
import Link from "next/link";
import Socials from "./Socials";
import { site } from "@/data/site";

const cols = [
  {
    title: "Rituels",
    links: [
      { href: "/coiffure", label: "Coiffure" },
      { href: "/spa", label: "Spa" },
      { href: "/ongles", label: "Ongles" },
      { href: "/esthetique", label: "Esthétique" },
      { href: "/carte", label: "La carte" },
    ],
  },
  {
    title: "Le salon",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/galerie", label: "Galerie" },
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/#contact", label: "Nous trouver" },
    ],
  },
];

export default function Footer() {
  const phone = site.phone;
  return (
    <footer className="foot sec--noir">
      <div className="wrap">
        <div className="foot__grid">
          <div className="foot__brand">
            <Link href="/" className="logo foot__logo" aria-label="ZST Beauty Center, accueil">
              <Image src="/logo/logo-zst.png" alt="ZST Beauty Center" width={64} height={64} />
            </Link>
            <p className="foot__tag bod">Là où commence la beauté.</p>
            <p className="foot__about">Salon de beauté afro à Fidjrossè, Cotonou : coiffure, spa, ongles et esthétique.</p>
          </div>

          {cols.map((c) => (
            <nav key={c.title} className="foot__col" aria-label={c.title}>
              <h2 className="lb foot__h">{c.title}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="foot__col foot__contact">
            <h2 className="lb foot__h">Contact</h2>
            <ul>
              <li>{site.address}</li>
              {phone && <li><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></li>}
              {site.whatsapp && <li><a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
              {site.email && <li><a href={`mailto:${site.email}`}>{site.email}</a></li>}
            </ul>
            <Socials tone="ivoire" className="foot__socials" />
          </div>

        </div>

        <div className="foot__bottom lb lb--s">
          <span>© {new Date().getFullYear()} ZST Beauty Center</span>
          <span className="foot__legal">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
