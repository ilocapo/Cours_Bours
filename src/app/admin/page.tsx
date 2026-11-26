import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

// v3 : espace admin (agenda, fiches clientes, prestations, personnel, statistiques).
// Non publié : introuvable en production.
export default function Admin() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <section className="sec sec--prune center-page">
      <div className="wrap"><p className="lb">Espace admin — à venir (v3)</p></div>
    </section>
  );
}
