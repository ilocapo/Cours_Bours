// Avis Google publics du salon (texte repris tel quel). Noms abrégés.
export type Review = { id: string; author: string; text: string; source: "Google" | "Instagram" | "Facebook" };
export const reviews: Review[] = [
  { id: "r1", author: "Annie G.", source: "Google", text: "C'est du professionnalisme. Tout y est bien pensé pour le grand soin de la femme." },
  { id: "r2", author: "Thérèse D.", source: "Google", text: "Salon agréable et très accueillant. Service de qualité avec une équipe au petit soin." },
  { id: "r3", author: "Hermine T.", source: "Google", text: "Professionnalisme, cadre propre et équipée." },
  { id: "r4", author: "Aris Z.", source: "Google", text: "Travail parfait et service très excellent." },
];
