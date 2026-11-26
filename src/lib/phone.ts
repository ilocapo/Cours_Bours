// Numéros de téléphone : saisie avec indicatif pays, stockage au format international (E.164, ex. +22997000001).
// Partagé entre le formulaire (navigateur) et le serveur : mêmes règles des deux côtés.
export type Country = { dial: string; name: string; lens: number[]; trunk0?: boolean };

// Longueurs du numéro national, sans indicatif ni zéro initial de ligne (trunk). Le Bénin accepte l'ancien format à 8 chiffres
// et le nouveau à 10 chiffres (le « 01 » fait partie du numéro depuis 2024).
export const COUNTRIES: Country[] = [
  { dial: "229", name: "Bénin", lens: [8, 10] },
  { dial: "228", name: "Togo", lens: [8] },
  { dial: "234", name: "Nigeria", lens: [10], trunk0: true },
  { dial: "233", name: "Ghana", lens: [9], trunk0: true },
  { dial: "225", name: "Côte d'Ivoire", lens: [8, 10] },
  { dial: "221", name: "Sénégal", lens: [9] },
  { dial: "223", name: "Mali", lens: [8] },
  { dial: "226", name: "Burkina Faso", lens: [8] },
  { dial: "227", name: "Niger", lens: [8] },
  { dial: "237", name: "Cameroun", lens: [9] },
  { dial: "241", name: "Gabon", lens: [7, 8] },
  { dial: "242", name: "Congo", lens: [9] },
  { dial: "243", name: "RD Congo", lens: [9], trunk0: true },
  { dial: "33", name: "France", lens: [9], trunk0: true },
  { dial: "32", name: "Belgique", lens: [8, 9], trunk0: true },
  { dial: "41", name: "Suisse", lens: [9], trunk0: true },
  { dial: "44", name: "Royaume-Uni", lens: [10], trunk0: true },
  { dial: "49", name: "Allemagne", lens: [10, 11], trunk0: true },
  { dial: "39", name: "Italie", lens: [9, 10] },
  { dial: "34", name: "Espagne", lens: [9] },
  { dial: "212", name: "Maroc", lens: [9], trunk0: true },
  { dial: "213", name: "Algérie", lens: [9], trunk0: true },
  { dial: "216", name: "Tunisie", lens: [8] },
  { dial: "1", name: "États-Unis, Canada", lens: [10] },
];

export type PhoneResult = { ok: true; e164: string; country: string } | { ok: false; error: string };

const byDialDesc = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Vérifie un numéro national pour un indicatif donné (sans le « + »). */
export function checkNational(dial: string, national: string): PhoneResult {
  const c = COUNTRIES.find((x) => x.dial === dial);
  let d = national.replace(/[\s.\-()]/g, "");
  if (/[^\d]/.test(d)) return { ok: false, error: "Le numéro ne doit contenir que des chiffres." };
  if (c?.trunk0 && d.startsWith("0")) d = d.slice(1);
  if (!d) return { ok: false, error: "Indiquez votre numéro de téléphone." };
  if (c) {
    if (!c.lens.includes(d.length)) {
      const want = c.lens.join(" ou ");
      return { ok: false, error: `Numéro ${c.name} invalide : ${want} chiffres attendus après +${c.dial}${c.trunk0 ? " (sans le 0 du début)" : ""}.` };
    }
    return { ok: true, e164: `+${dial}${d}`, country: c.name };
  }
  if (d.length < 6 || d.length + dial.length > 15) return { ok: false, error: "Ce numéro ne semble pas valide." };
  return { ok: true, e164: `+${dial}${d}`, country: "" };
}

/** Lit un numéro saisi en entier : « +229 97 00 00 01 », « 00229… ». L'indicatif est obligatoire. */
export function parsePhone(input: string): PhoneResult {
  let s = input.trim().replace(/[\s.\-()]/g, "");
  if (!s) return { ok: false, error: "Indiquez votre numéro de téléphone." };
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) return { ok: false, error: "Ajoutez l'indicatif du pays (par exemple +229)." };
  s = s.slice(1);
  if (/[^\d]/.test(s)) return { ok: false, error: "Le numéro ne doit contenir que des chiffres." };
  const c = byDialDesc.find((x) => s.startsWith(x.dial));
  if (c) return checkNational(c.dial, s.slice(c.dial.length));
  if (s.length < 8 || s.length > 15) return { ok: false, error: "Ce numéro ne semble pas valide." };
  return { ok: true, e164: `+${s}`, country: "" };
}

/** Affichage lisible : +229 97 00 00 01. */
export function formatPhone(e164: string): string {
  const m = /^\+(\d+)$/.exec(e164.replace(/\s/g, ""));
  if (!m) return e164;
  const digits = m[1];
  const c = byDialDesc.find((x) => digits.startsWith(x.dial));
  if (!c) return e164;
  const rest = digits.slice(c.dial.length).replace(/(\d{2})(?=\d)/g, "$1 ");
  return `+${c.dial} ${rest}`;
}
