"use client";
import { useEffect, useState } from "react";
import Arch from "./Arch";
import BookingButton from "./BookingButton";
import Chrome from "./Chrome";
import FaqPanel from "./FaqPanel";
import MonoArch from "./MonoArch";
import Pastille from "./Pastille";
import Socials from "./Socials";
import Title from "./Title";
import { photos } from "@/data/photos";
import { site } from "@/data/site";
import { openingHours, hoursDefined, todayHours } from "@/data/hours";

// « Nous trouver » : adresse, horaires, paiement, Réserver, Itinéraire.
export default function Contact({ photo = true, tone = "iv" }: { photo?: boolean; tone?: "iv" | "prune" }) {
  const [today, setToday] = useState<ReturnType<typeof todayHours> | null>(null);
  useEffect(() => { setToday(todayHours()); }, []);
  const pt = tone === "iv" ? "prune" : "ivoire";
  return (
    <section className={`sec sec--${tone} contact ${photo ? "panel" : ""}`} id="contact">
      <div className="wrap">
        <Chrome left="Nous trouver" right="Fidjrossè · Cotonou" />
        <Title lines={["Passez nous", "voir."]} />
        <div className="contact__grid">
          {photo ? (
            <Arch src={photos.salonLogo.src} alt={photos.salonLogo.alt} position={photos.salonLogo.position} ratio="4 / 5" sizes="(min-width: 1024px) 34vw, 86vw" />
          ) : (
            <MonoArch variant="pleine" tone={tone === "iv" ? "prune" : "ivoire"} size={120} className="monoarch--big" />
          )}
          <div className="contact__info">
            <div className="contact__block" data-fade>
              <Pastille name="zeste" tone={pt} />
              <div>
                <div className="lb dim">Adresse</div>
                <p>{site.address}</p>
                {site.addressNote && <p className="dim">{site.addressNote}</p>}
                <p className="contact__lines">
                  {site.phone && <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>}
                  {site.whatsapp && <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </p>
              </div>
            </div>
            <div className="contact__block" data-fade>
              <Pastille name="sablier" tone={pt} />
              <div>
                <div className="lb dim">Horaires</div>
                {hoursDefined ? (
                  <ul className="hours">
                    {openingHours.map((h) => (
                      <li key={h.weekday} className={today?.label === h.label ? "is-today" : ""}>
                        <span>{h.label}</span>
                        <span>{h.opens && h.closes ? `${h.opens.replace(":", " h ").replace(" h 00", " h")} – ${h.closes.replace(":", " h ").replace(" h 00", " h")}` : "Fermé"}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p>À compléter</p>}
              </div>
            </div>
            <div className="contact__social" data-fade>
              <p className="lb lb--s dim">Réservez aussi par message privé : Instagram, WhatsApp</p>
              <Socials tone={tone === "iv" ? "prune" : "ivoire"} />
            </div>
            <p className="lb lb--s dim" data-fade>Paiement : {site.payments.join(" · ")}</p>
            <div className="contact__cta" data-fade>
              <BookingButton variant={tone === "iv" ? "prune" : "ivoire"}>Réserver</BookingButton>
              <a className={`btn btn--${tone === "iv" ? "outline-prune" : "outline"} btn--md lb`} href={site.mapsUrl} target="_blank" rel="noopener noreferrer">Itinéraire</a>
            </div>
            <FaqPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
