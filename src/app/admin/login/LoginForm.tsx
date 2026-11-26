"use client";
import { useActionState, useState } from "react";
import { login } from "../actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="adm__form" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="field"><span className="lb lb--s">Identifiant</span>
        <input name="identifiant" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="prenom@zst.test" required autoFocus /></label>
      <div className="field"><label className="lb lb--s" htmlFor="pw">Mot de passe</label>
        <div className="pwfield">
          <input id="pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="lb lb--s pwfield__btn" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Masquer" : "Afficher"}</button>
        </div></div>
      {state?.error && <p className="adm__warn" role="alert">{state.error}</p>}
      <button className="btn btn--ivoire btn--md lb" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
