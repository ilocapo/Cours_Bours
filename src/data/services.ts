// Même forme que la future table `services`.
// DONNÉES D'EXEMPLE : la vraie carte (prix, durées) est à venir.
export type Service = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  durationMin: number;
  priceCents: number | null; // null = prix à confirmer, non affiché
  active: boolean;
};

export const services: Service[] = [
  { id: "tresses-boheme", categoryId: "cat-coiffure", name: "Tresses bohème", durationMin: 240, priceCents: null, active: true },
  { id: "nattes-collees", categoryId: "cat-coiffure", name: "Nattes collées", durationMin: 180, priceCents: null, active: true },
  { id: "boucles", categoryId: "cat-coiffure", name: "Boucles définies", durationMin: 90, priceCents: null, active: true },
  { id: "soin-profond", categoryId: "cat-coiffure", name: "Soin profond", durationMin: 60, priceCents: null, active: true },
  { id: "coupe-homme", categoryId: "cat-coiffure", name: "Coupe homme", durationMin: 45, priceCents: null, active: true },
  { id: "soin-visage", categoryId: "cat-spa", name: "Soin visage éclat", durationMin: 60, priceCents: null, active: true },
  { id: "rituel-galets", categoryId: "cat-spa", name: "Rituel corps aux galets", durationMin: 75, priceCents: null, active: true },
  { id: "gommage", categoryId: "cat-spa", name: "Gommage doux", durationMin: 45, priceCents: null, active: true },
  { id: "massage", categoryId: "cat-spa", name: "Séance de massage", durationMin: 60, priceCents: null, active: true },
  { id: "pedicure", categoryId: "cat-ongles", name: "Pédicure", durationMin: 60, priceCents: null, active: true },
  { id: "pose-gel", categoryId: "cat-ongles", name: "Pose gel", durationMin: 75, priceCents: null, active: true },
  { id: "manucure", categoryId: "cat-ongles", name: "Manucure", durationMin: 45, priceCents: null, active: true },
  { id: "vernis-semi", categoryId: "cat-ongles", name: "Vernis semi-permanent", durationMin: 60, priceCents: null, active: true },
];

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: cents % 100 ? 2 : 0 })} €`;
}

export function servicesByCategory(categoryId: string): Service[] {
  return services.filter((s) => s.active && s.categoryId === categoryId);
}
