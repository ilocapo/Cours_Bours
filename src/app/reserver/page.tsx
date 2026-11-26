import type { Metadata } from "next";
import Link from "next/link";
import Title from "@/components/Title";
import Chrome from "@/components/Chrome";
import BookingButton from "@/components/BookingButton";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Réserver", description: "Réserver un rituel chez ZST Beauty Center." };

// Placeholder v1. En v2 : choix du rituel, de la durée, de la date, du créneau et de la personne.
export default function Reserver() {
  return (
    <section className="sec sec--prune center-page">
      <div className="wrap stack" style={{ maxWidth: 720 }}>
        <Chrome left="Réservation" right="Bientôt en ligne" />
        <Title as="h1" initial lines={["La réservation", "en ligne arrive."]} />
        <p data-fade>
          En attendant, réservez par WhatsApp ou par téléphone au {site.phone}. Vous pouvez aussi nous écrire sur Instagram :{" "}
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
            @{site.instagram}
          </a>
          .
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <BookingButton variant="ivoire">Réserver sur WhatsApp</BookingButton>
          <Link className="btn btn--prune lb" style={{ border: "1px solid rgba(242,234,223,.4)" }} href="/">Retour</Link>
        </div>
      </div>
    </section>
  );
}
