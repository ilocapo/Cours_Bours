import type { Metadata } from "next";
import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { requireUser } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { SCENARIOS, VARIABLES, templateFor } from "@/lib/booking/templates";
import { saveTemplateAction } from "../../actions";

export const metadata: Metadata = { title: "Modèles d'e-mails" };
export const dynamic = "force-dynamic";

export default async function Modeles({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const me = await requireUser("notifications");
  const sp = await searchParams;
  const settings = await (await getStore()).getSettings();
  return (
    <>
      <div className="adm__chips"><Link href="/admin/notifications">Journal des envois</Link><Link href="/admin/modeles" className="is-on">Modèles et scénarios</Link></div>
      <h1 className="bod adm__h1">Modèles d&apos;e-mails</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="dim">Chaque scénario part tout seul au bon moment. Vous pouvez modifier les textes, ou désactiver un scénario. Le récapitulatif du rendez-vous et le bouton sont ajoutés automatiquement. Il n&apos;y a pas d&apos;espace client sur le site : tout passe par l&apos;e-mail.</p>
      <div className="adm__card"><p className="lb lb--s dim">Variables à utiliser dans les textes</p><p>{VARIABLES.map((v) => <span key={v.key} className="chipvar" title={v.desc}><code>{v.key}</code></span>)}</p></div>
      {SCENARIOS.map((sc) => {
        const t = templateFor(settings, sc.key);
        const custom = !!settings.templates?.[sc.key];
        return (
          <form key={sc.key} id={sc.key} action={saveTemplateAction} className="adm__card adm__form">
            <input type="hidden" name="key" value={sc.key} />
            <div className="adm__bar"><div><h2 className="bod adm__h2" style={{ marginTop: 0 }}>{sc.name}</h2><p className="dim">{sc.when}</p></div>
              <label className="check"><input type="checkbox" name="enabled" defaultChecked={t.enabled} /><span>Activé</span></label></div>
            <label className="field"><span className="lb lb--s">Objet de l&apos;e-mail</span><input name="subject" defaultValue={t.subject} required /></label>
            <label className="field"><span className="lb lb--s">Titre dans le message</span><input name="title" defaultValue={t.title} required /></label>
            <label className="field"><span className="lb lb--s">Texte (une ligne vide = nouveau paragraphe)</span><textarea name="body" rows={7} defaultValue={t.body} required /></label>
            <p className="lb lb--s dim">Bouton ajouté sous le texte : « {sc.button} »{custom ? " · texte modifié" : " · texte d'origine"}</p>
            <div className="adm__actions">
              <button className="btn btn--prune btn--sm lb" name="intent" value="save">Enregistrer</button>
              <label className="field field--inline"><span className="lb lb--s">Test à</span><input name="to" type="email" defaultValue={me.email.includes("@") ? me.email : ""} placeholder="vous@exemple.com" /></label>
              <button className="btn btn--outline-prune btn--sm lb" name="intent" value="test">Envoyer un test</button>
              {custom && <button className="lb lb--s adm__link" name="intent" value="reset">Rétablir le texte d&apos;origine</button>}
            </div>
          </form>
        );
      })}
    </>
  );
}
