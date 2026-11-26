import Link from "next/link";
import Arch from "./Arch";
import BookingButton from "./BookingButton";
import Trait from "./Trait";
import { photos } from "@/data/photos";
import { site } from "@/data/site";
import { openingHours, hoursDefined } from "@/data/hours";

export default function Footer() {
  return (
    <footer className="foot sec sec--noir panel" id="contact">
      <div className="wrap foot__grid">
        <div className="foot__photo">
          <Arch src={photos.salonLogo.src} alt={photos.salonLogo.alt} position={photos.salonLogo.position} ratio="1 / 1.05" sizes="(min-width: 1280px) 34vw, 90vw" />
        </div>
        <div className="foot__info">
          <div className="lb dim" data-fade>Nous trouver</div>
          <div className="foot__cols" data-fade>
            <div>
              <div className="lb lb--s dim">Adresse</div>
              <p>{site.address ?? "À compléter"}{site.addressNote && <><br /><span className="dim">{site.addressNote}</span></>}</p>
              {site.phone && <p><a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a></p>}
              {site.whatsapp && <p><a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>}
            </div>
            <div>
              <div className="lb lb--s dim">Horaires</div>
              {hoursDefined ? (
                <ul className="hours">
                  {openingHours.map((h) => (
                    <li key={h.weekday}>
                      <span>{h.label}</span>
                      <span>{h.opens && h.closes ? `${h.opens} – ${h.closes}` : "Fermé"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>À compléter</p>
              )}
            </div>
          </div>
          <p className="lb lb--s dim" data-fade>Paiement : {site.payments.join(" · ")}</p>
          <div data-fade style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}><BookingButton variant="ivoire">Réserver</BookingButton><a className="lb" href={site.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 5 }}>Itinéraire</a></div>
        </div>
      </div>

      <div className="wrap">
        <Trait name="trait" className="foot__trait" />
        <div className="foot__zst bod" aria-hidden="true" data-zst>ZST</div>
        <div className="lb lb--s dim foot__links">
          <span>Beauty Center</span>
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>
          {site.email ? <a href={`mailto:${site.email}`}>Contact</a> : <span>Contact à venir</span>}
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </div>
      </div>
    </footer>
  );
}
