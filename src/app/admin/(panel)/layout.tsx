import Link from "next/link";
import Image from "next/image";
import { logout } from "../actions";
import { getStore } from "@/lib/booking/store";
import { requireUser } from "@/lib/admin/session";
import { NAV, can } from "@/lib/admin/roles";
import { ROLE_LABEL } from "@/lib/booking/types";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const store = await getStore();
  const items = NAV.filter((n) => (n.any ? n.any.some((p) => can(me.role, p)) : n.perm ? can(me.role, n.perm) : true));
  return (
    <div className="adm__shell">
      <aside className="adm__side">
        <Link href="/admin" className="logo" aria-label="Gestion ZST"><Image src="/logo/logo-zst.png" alt="ZST" width={42} height={42} /></Link>
        <nav className="adm__nav" aria-label="Gestion">
          {items.map((n) => <Link key={n.href} href={n.href} className="lb">{n.label}</Link>)}
        </nav>
        <div className="adm__side-foot">
          <p className="adm__who"><strong>{me.name}</strong><span className="lb lb--s dim">{ROLE_LABEL[me.role]}</span></p>
          <p className="lb lb--s dim adm__only-wide">{store.kind === "supabase" ? "Base : Supabase" : "Base : fichier local (test)"}</p>
          <Link className="lb lb--s adm__only-wide" href="/admin/profil">Mon mot de passe</Link>
          <Link className="lb lb--s adm__only-wide" href="/" target="_blank">Voir le site</Link>
          <form action={logout}><button className="lb lb--s adm__link">Se déconnecter</button></form>
        </div>
      </aside>
      <main className="adm__main" id="main">{children}</main>
    </div>
  );
}
