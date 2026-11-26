import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { site } from "@/data/site";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Mentions() {
  return (
    <>
      <section className="sec sec--prune legal">
        <div className="wrap">
          <h1 className="bod">Mentions légales</h1>
          <p className="lb dim">À compléter avec les informations du salon avant la mise en ligne.</p>
          <h2>Éditeur du site</h2>
          <p>{site.name}. Raison sociale, forme juridique, SIRET, adresse : à compléter.</p>
          <p>Responsable de la publication : à compléter.</p>
          <h2>Contact</h2>
          <p>{site.email ?? "E-mail : à compléter"} · {site.phone ?? "Téléphone : à compléter"}</p>
          <h2>Hébergement</h2>
          <p>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</p>
          <h2>Propriété intellectuelle</h2>
          <p>Le logo, les photographies, les textes et les illustrations sont la propriété de {site.name}. Toute reproduction sans accord écrit est interdite.</p>
        </div>
      </section>
      <Footer />
    </>
  );
}
