import type { Metadata } from "next";
import Link from "next/link";
import Title from "@/components/Title";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Réserver", description: "Réserver un rituel chez ZST Beauty Center." };

// Placeholder v1. En v2 : choix du rituel, de la durée, de la date, du créneau et de la personne.
export default function Reserver() {
  return (
    <section className="sec sec--prune center-page">
      <div className="wrap stack" style={{ maxWidth: 720 }}>
        <div className="lb dim">Réservation</div>
        <Title as="h1" lines={["La réservation", "en ligne arrive."]} />
        <p data-fade>
          En attendant, vous pouvez nous écrire sur Instagram :{" "}
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
            @{site.instagram}
          </a>
          .
        </p>
        <div><Link className="btn btn--ivoire lb" href="/">Retour à l&apos;accueil</Link></div>
      </div>
    </section>
  );
}
