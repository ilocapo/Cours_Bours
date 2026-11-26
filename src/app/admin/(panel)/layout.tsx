import Link from "next/link";
import Image from "next/image";
import { logout } from "../actions";
import { getStore } from "@/lib/booking/store";

const nav = [
  { href: "/admin", label: "Aujourd'hui" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/prestations", label: "Prestations" },
  { href: "/admin/equipe", label: "Équipe" },
  { href: "/admin/notifications", label: "Rappels" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function Panel({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  return (
    <div className="adm__shell">
      <aside className="adm__side">
        <Link href="/admin" className="logo" aria-label="Gestion ZST"><Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} /></Link>
        <nav className="adm__nav" aria-label="Gestion">
          {nav.map((n) => <Link key={n.href} href={n.href} className="lb">{n.label}</Link>)}
        </nav>
        <div className="adm__side-foot">
          <p className="lb lb--s dim adm__only-wide">{store.kind === "supabase" ? "Base : Supabase" : "Base : fichier local (test)"}</p>
          <Link className="lb lb--s adm__only-wide" href="/" target="_blank">Voir le site</Link>
          <form action={logout}><button className="lb lb--s adm__link">Se déconnecter</button></form>
        </div>
      </aside>
      <main className="adm__main" id="main">{children}</main>
    </div>
  );
}
