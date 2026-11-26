export default function Flash({ ok, erreur }: { ok?: string; erreur?: string }) {
  return (
    <>
      {ok && <p className="adm__ok" role="status">{ok === "1" ? "Enregistré." : ok}</p>}
      {erreur && <p className="adm__warn" role="alert">{erreur}</p>}
    </>
  );
}
