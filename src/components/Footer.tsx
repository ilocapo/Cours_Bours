import Link from "next/link";
import MonoArch from "./MonoArch";
import Trait from "./Trait";
import { site } from "@/data/site";

export default function Footer() {
  return (
    <footer className="foot sec sec--noir">
      <div className="wrap">
        <Trait name="trait" className="foot__trait" />
        <div className="foot__mono"><MonoArch variant="filet" tone="ivoire" size={84} /></div>
        <div className="foot__zst bod" aria-hidden="true" data-zst>ZST</div>
        <div className="lb foot__links">
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>
          {site.email && <a href={`mailto:${site.email}`}>Contact</a>}
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </div>
        <p className="lb foot__cap">ZST Beauty Center · Là où commence la beauté.</p>
      </div>
    </footer>
  );
}
