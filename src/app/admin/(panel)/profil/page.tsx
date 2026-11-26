import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { ROLE_DESC } from "@/lib/admin/roles";
import { ROLE_LABEL } from "@/lib/booking/types";
import { changeOwnPassword } from "../../actions";

export const metadata: Metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

export default async function Profil({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  return (
    <>
      <h1 className="bod adm__h1">Mon compte</h1>
      <Flash ok={sp.ok ? "Mot de passe modifié." : undefined} erreur={sp.erreur} />
      <p><strong>{me.name}</strong><br /><span className="dim">{me.email} · {ROLE_LABEL[me.role]}</span><br /><span className="dim">{ROLE_DESC[me.role]}</span></p>
      <form action={changeOwnPassword} className="adm__form" style={{ maxWidth: 420 }}>
        <label className="field"><span className="lb lb--s">Mot de passe actuel</span><input name="current" type="password" autoComplete="current-password" required /></label>
        <label className="field"><span className="lb lb--s">Nouveau mot de passe</span><input name="next" type="password" autoComplete="new-password" required /></label>
        <label className="field"><span className="lb lb--s">Répéter</span><input name="again" type="password" autoComplete="new-password" required /></label>
        <button className="btn btn--prune btn--md lb">Changer le mot de passe</button>
      </form>
    </>
  );
}
