import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Gestion", template: "%s — Gestion ZST" }, robots: { index: false, follow: false } };

// Plein écran par-dessus le site : l'espace de gestion n'affiche ni menu public ni barre de réservation.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm" data-lenis-prevent>{children}</div>;
}
