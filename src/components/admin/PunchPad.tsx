"use client";
import { useActionState, useEffect, useState } from "react";
import { punchAction } from "@/app/admin/actions";

export type PunchPerson = { id: string; name: string; color: string; state: "in" | "out" | "none"; since: string; hasPin: boolean };

// Pointage : on touche son prénom, on tape son code, c'est enregistré. Pensé pour le téléphone.
export default function PunchPad({ people }: { people: PunchPerson[] }) {
  const [sel, setSel] = useState<PunchPerson | null>(null);
  const [state, action, pending] = useActionState(punchAction, undefined);
  // Pointage réussi : on revient à la liste ; en cas d'erreur, on reste sur le code pour réessayer.
  useEffect(() => { if (state?.ok) setSel(null); }, [state]);
  return (
    <div className="punch">
      {state?.ok && <p className="adm__ok punch__ok" role="status">{state.ok}</p>}
      {!sel ? (
        <>
          <p className="dim">Touchez votre prénom, puis tapez votre code personnel.</p>
          <div className="punch__people">
            {people.map((p) => (
              <button key={p.id} type="button" className="punch__who" onClick={() => setSel(p)}>
                <span className="avatar" style={{ background: p.color }}>{p.name.charAt(0)}</span>
                <strong>{p.name}</strong>
                <span className={`lb lb--s ${p.state === "in" ? "punch__in" : "dim"}`}>{p.state === "in" ? `Au salon depuis ${p.since}` : p.state === "out" ? `Partie à ${p.since}` : "Pas encore pointée"}</span>
              </button>
            ))}
            {people.length === 0 && <p className="dim">Ajoutez d&apos;abord l&apos;équipe dans « Équipe ».</p>}
          </div>
        </>
      ) : (
        <form action={action} className="punch__form">
          <input type="hidden" name="staffId" value={sel.id} />
          <p className="bod punch__name"><span className="avatar" style={{ background: sel.color }}>{sel.name.charAt(0)}</span>{sel.name}</p>
          <label className="field"><span className="lb lb--s">Votre code personnel</span>
            <input name="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus required placeholder="••••" className="punch__pin" /></label>
          {state?.error && <p className="adm__warn" role="alert">{state.error}</p>}
          <button className="btn btn--prune btn--md lb punch__go" disabled={pending}>{pending ? "…" : sel.state === "in" ? "Pointer mon départ" : "Pointer mon arrivée"}</button>
          <button type="button" className="lb link-plain" onClick={() => setSel(null)}>Changer de personne</button>
        </form>
      )}
    </div>
  );
}
