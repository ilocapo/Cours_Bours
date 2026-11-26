import type { Metadata } from "next";
import Flash from "@/components/admin/Flash";
import { requireUser, TEST_USERS } from "@/lib/admin/session";
import { ROLE_DESC } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { ROLE_LABEL, type Role } from "@/lib/booking/types";
import { createUserAction, updateUserAction } from "../../actions";

export const metadata: Metadata = { title: "Comptes" };
export const dynamic = "force-dynamic";
const ROLES: Role[] = ["super_admin", "gerant", "employe", "comptable"];

export default async function Utilisateurs({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireUser("users");
  const sp = await searchParams;
  const store = await getStore();
  let users: Awaited<ReturnType<typeof store.listUsers>> = [];
  let missing = false;
  try { users = await store.listUsers(); } catch { missing = true; }
  const staff = await store.listStaff();
  const testEmails = new Set(TEST_USERS.map((t) => t.email));
  const roleSelect = (name: string, v: Role) => <select name={name} defaultValue={v}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>;
  const staffSelect = (v: string | null) => <select name="staffId" defaultValue={v ?? ""}><option value="">Aucune fiche</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>;
  return (
    <>
      <h1 className="bod adm__h1">Comptes</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      {missing && <p className="adm__warn">La table des comptes n&apos;existe pas encore : exécutez <code>supabase/migrations/0002_gestion.sql</code> dans Supabase. En attendant, l&apos;identifiant « admin » (mot de passe ADMIN_PASSWORD) fonctionne.</p>}
      <div className="adm__table">{ROLES.map((r) => <div key={r} className="adm__trow adm__trow--2"><strong>{ROLE_LABEL[r]}</strong><span className="dim">{ROLE_DESC[r]}</span></div>)}</div>
      {users.some((u) => testEmails.has(u.email)) && <p className="adm__warn">Des comptes de test (@zst.test) existent avec des mots de passe connus. Créez les vrais comptes, puis désactivez ceux-là.</p>}
      {users.map((u) => (
        <form key={u.id} action={updateUserAction} className="adm__user">
          <input type="hidden" name="id" value={u.id} />
          <div><strong>{u.email}</strong><br /><span className="lb lb--s dim">{ROLE_LABEL[u.role]}{u.active ? "" : " · désactivé"}</span></div>
          <label className="field"><span className="lb lb--s">Nom</span><input name="name" defaultValue={u.name} /></label>
          <label className="field"><span className="lb lb--s">Rôle</span>{roleSelect("role", u.role)}</label>
          <label className="field"><span className="lb lb--s">Fiche équipe</span>{staffSelect(u.staffId)}</label>
          <label className="field"><span className="lb lb--s">Nouveau mot de passe</span><input name="password" type="text" autoComplete="off" placeholder="laisser vide pour ne pas changer" /></label>
          <label className="check"><input type="checkbox" name="active" defaultChecked={u.active} /><span>Actif</span></label>
          <button className="btn btn--outline-prune btn--sm lb">Enregistrer</button>
        </form>
      ))}
      <h2 className="bod adm__h2">Créer un compte</h2>
      <form action={createUserAction} className="adm__form adm__grid">
        <label className="field"><span className="lb lb--s">Identifiant (e-mail ou prénom)</span><input name="email" required autoCapitalize="none" placeholder="mireille@zst.com" /></label>
        <label className="field"><span className="lb lb--s">Nom affiché</span><input name="name" required /></label>
        <label className="field"><span className="lb lb--s">Rôle</span>{roleSelect("role", "employe")}</label>
        <label className="field"><span className="lb lb--s">Fiche équipe (employée)</span>{staffSelect(null)}</label>
        <label className="field"><span className="lb lb--s">Mot de passe (8 caractères mini, lettres et chiffre)</span><input name="password" type="text" autoComplete="off" required /></label>
        <div className="adm__wide"><button className="btn btn--prune btn--md lb">Créer le compte</button></div>
      </form>
    </>
  );
}
