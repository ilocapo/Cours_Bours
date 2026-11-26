/** Adresse e-mail : format courant, sans espace, un seul @, un point dans le domaine, pas de points doubles. */
export function checkEmail(input: string): { ok: true; email: string } | { ok: false; error: string } {
  const email = input.trim().toLowerCase();
  if (!email) return { ok: false, error: "Indiquez votre adresse e-mail." };
  const ok =
    email.length <= 254 &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email) &&
    !email.includes("..") && !email.startsWith(".") && !email.split("@")[0].endsWith(".");
  if (!ok) return { ok: false, error: "Cette adresse e-mail ne semble pas valide (exemple : prenom@gmail.com)." };
  if (/@(gmial|gmai|gamil|gnail)\.com$|@(hotmial|hotmal)\.(com|fr)$|@yaho\.(com|fr)$/.test(email)) return { ok: false, error: "Vérifiez l'orthographe de votre adresse e-mail." };
  return { ok: true, email };
}

export function checkName(input: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 2 || !/\p{L}/u.test(name)) return { ok: false, error: "Indiquez votre nom et prénom." };
  if (name.length > 80) return { ok: false, error: "Ce nom est trop long." };
  return { ok: true, name };
}
