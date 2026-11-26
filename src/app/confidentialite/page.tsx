import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <>
      <section className="sec sec--prune legal">
        <div className="wrap">
          <h1 className="bod">Politique de confidentialité</h1>
          <p className="lb dim">À valider avec le salon avant la mise en ligne.</p>
          <h2>Données collectées</h2>
          <p>Ce site vitrine ne collecte aucune donnée personnelle et ne dépose aucun cookie de suivi ou de publicité.</p>
          <h2>Réservation</h2>
          <p>La réservation se fait sur un service tiers (Planity ou Fresha), qui applique sa propre politique de confidentialité.</p>
          <h2>Réservation en ligne sur le site (à venir)</h2>
          <p>Lorsque la réservation en ligne sera ouverte, les données de réservation (nom, e-mail, téléphone, rendez-vous) seront stockées dans l&apos;Union européenne. Les rappels par e-mail ou SMS ne seront envoyés qu&apos;avec votre consentement, avec un lien de désinscription dans chaque message.</p>
          <h2>Vos droits</h2>
          <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en nous écrivant. Vous pouvez aussi saisir la CNIL.</p>
        </div>
      </section>
      <Footer />
    </>
  );
}
