// Même forme que la table `staff`.
export type Shift = { start: string; end: string }; // « 09:00 »
export type Staff = {
  id: string;
  name: string;
  categoryIds: string[]; // univers pratiqués (vide = tous)
  serviceIds: string[]; // prestations précises (vide = toutes celles des univers)
  schedule: Record<number, Shift | null> | null; // 1 = lundi ; null = suit les horaires du salon ; clé absente / null = repos
  color: string;
  active: boolean;
  pinHash?: string | null;        // code de pointage personnel (haché)
  pinFails?: number;              // essais ratés d'affilée
  pinLockedUntil?: string | null; // blocage temporaire après 5 essais ratés
};
export const staff: Staff[] = [];
