import type { Settings, TemplateEdit, TemplateKey } from "./types";

// Scénarios d'e-mails à la cliente. Ton : on vouvoie, phrases courtes, pas de superlatifs.
// Variables disponibles dans les textes : {prenom} {nom} {prestation} {date} {heure} {quand} {adresse} {telephone}
export const VARIABLES: { key: string; desc: string }[] = [
  { key: "{prenom}", desc: "Prénom de la cliente" },
  { key: "{prestation}", desc: "Nom de la prestation" },
  { key: "{date}", desc: "Jour (ex. mardi 1er décembre 2026)" },
  { key: "{heure}", desc: "Heure (ex. 10 h 30)" },
  { key: "{quand}", desc: "Jour et heure ensemble" },
  { key: "{adresse}", desc: "Adresse du salon" },
  { key: "{telephone}", desc: "Téléphone du salon" },
];

export type Scenario = {
  key: TemplateKey;
  name: string;
  when: string; // explication pour la gérante
  button: string; // bouton ajouté automatiquement sous le texte
  transactional: boolean; // vrai : message lié au rendez-vous (pas de consentement marketing nécessaire)
  defaults: TemplateEdit;
};

export const SCENARIOS: Scenario[] = [
  {
    key: "confirmation", name: "Confirmation de rendez-vous", when: "Tout de suite après la réservation, avec le fichier pour l'agenda.", button: "Voir, déplacer ou annuler", transactional: true,
    defaults: { enabled: true, subject: "Votre rendez-vous du {date}", title: "Votre rendez-vous est confirmé.",
      body: "Bonjour {prenom},\n\nNous vous attendons chez ZST Beauty Center. Arrivez quelques minutes en avance : nous prendrons le temps qu'il faut pour vous.\n\nUn empêchement ? Prévenez-nous, le créneau pourra être proposé à une autre cliente." },
  },
  {
    key: "reminder_d1", name: "Rappel de la veille", when: "La veille du rendez-vous à l'heure choisie dans les réglages (18 h par défaut). Seulement si la cliente l'a accepté.", button: "Voir ou annuler", transactional: true,
    defaults: { enabled: true, subject: "Demain, {prestation}", title: "À demain chez ZST.",
      body: "Bonjour {prenom},\n\nUn petit rappel : nous vous attendons demain pour {prestation}. Si vous ne pouvez plus venir, dites-le-nous dès que possible." },
  },
  {
    key: "reminder_h2", name: "Rappel avant le rendez-vous", when: "Quelques heures avant (2 h par défaut). Seulement si la cliente l'a accepté.", button: "Voir ou annuler", transactional: true,
    defaults: { enabled: true, subject: "Rappel : aujourd'hui à {heure}", title: "On vous attend bientôt.",
      body: "Bonjour {prenom},\n\nNous vous attendons aujourd'hui à {heure}. À tout à l'heure." },
  },
  {
    key: "thanks", name: "Merci et avis Google", when: "Environ 2 h après la prestation, quand elle est marquée « Terminé ». Invite à laisser un avis Google : pas d'espace client sur le site.", button: "Laisser un avis Google", transactional: false,
    defaults: { enabled: true, subject: "Merci pour votre visite", title: "Merci pour votre visite.",
      body: "Bonjour {prenom},\n\nMerci d'avoir pris ce moment chez ZST. Votre avis compte beaucoup pour nous : en une minute, il aide d'autres femmes à nous trouver.\n\nSi quelque chose ne vous a pas plu, répondez simplement à ce message. Nous vous lirons." },
  },
  {
    key: "client_cancel", name: "Annulation confirmée", when: "Quand un rendez-vous est annulé, par la cliente ou par le salon.", button: "Choisir un nouveau créneau", transactional: true,
    defaults: { enabled: true, subject: "Votre rendez-vous du {date} est annulé", title: "Votre rendez-vous est annulé.",
      body: "Bonjour {prenom},\n\nVotre rendez-vous du {quand} est bien annulé. Vous pouvez choisir un nouveau créneau quand vous le souhaitez. Nous espérons vous revoir bientôt." },
  },
  {
    key: "noshow", name: "Suivi après une absence", when: "Quand un rendez-vous est marqué « Absente ». Désactivé par défaut : à activer si vous le souhaitez.", button: "Reprendre rendez-vous", transactional: true,
    defaults: { enabled: false, subject: "Nous ne vous avons pas vue aujourd'hui", title: "Nous ne vous avons pas vue.",
      body: "Bonjour {prenom},\n\nNous vous attendions aujourd'hui à {heure} et nous ne vous avons pas vue. J'espère que tout va bien. Pour reprendre rendez-vous, c'est très simple." },
  },
];

export const scenario = (k: TemplateKey) => SCENARIOS.find((s) => s.key === k)!;

/** Texte en vigueur : celui modifié par la gérante, sinon celui d'origine. */
export function templateFor(settings: Settings, key: TemplateKey): TemplateEdit {
  return { ...scenario(key).defaults, ...(settings.templates?.[key] ?? {}) };
}

export function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}
