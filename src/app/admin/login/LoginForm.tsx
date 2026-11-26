"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="adm__form">
      <input type="hidden" name="next" value={next} />
      <label className="field"><span className="lb lb--s">Mot de passe</span><input type="password" name="password" autoComplete="current-password" required autoFocus /></label>
      {state?.error && <p className="adm__warn" role="alert">{state.error}</p>}
      <button className="btn btn--ivoire btn--md lb" disabled={pending}>{pending ? "Connexion…" : "Entrer"}</button>
    </form>
  );
}
