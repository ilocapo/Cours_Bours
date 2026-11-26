// Même forme que la future table `services`.
// DONNÉES D'EXEMPLE : la vraie carte (prix, durées) est à venir.
export type Service = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  durationMin: number;
  price: number | null; // en francs CFA (XOF, sans décimale) ; null = prix à confirmer, non affiché
  active: boolean;
};

export const services: Service[] = [
  { id: "tresses-boheme", categoryId: "cat-coiffure", name: "Tresses bohème", durationMin: 240, price: null, active: true },
  { id: "knotless", categoryId: "cat-coiffure", name: "Knotless braids", durationMin: 300, price: null, active: true },
  { id: "nattes-collees", categoryId: "cat-coiffure", name: "Nattes collées", durationMin: 150, price: null, active: true },
  { id: "vanilles", categoryId: "cat-coiffure", name: "Vanilles et twists", durationMin: 180, price: null, active: true },
  { id: "tissage", categoryId: "cat-coiffure", name: "Pose de tissage", durationMin: 150, price: null, active: true },
  { id: "perruque", categoryId: "cat-coiffure", name: "Pose de perruque", durationMin: 60, price: null, active: true },
  { id: "brushing", categoryId: "cat-coiffure", name: "Brushing", durationMin: 45, price: null, active: true },
  { id: "boucles", categoryId: "cat-coiffure", name: "Boucles définies", durationMin: 90, price: null, active: true },
  { id: "soin-profond", categoryId: "cat-coiffure", name: "Soin profond", durationMin: 60, price: null, active: true },
  { id: "coupe-femme", categoryId: "cat-coiffure", name: "Coupe femme", durationMin: 60, price: null, active: true },
  { id: "coupe-homme", categoryId: "cat-coiffure", name: "Coupe homme", durationMin: 45, price: null, active: true },
  { id: "coiffure-enfant", categoryId: "cat-coiffure", name: "Coiffure enfant", durationMin: 90, price: null, active: true },
  { id: "massage-relaxant", categoryId: "cat-spa", name: "Massage relaxant", durationMin: 60, price: null, active: true },
  { id: "massage-galets", categoryId: "cat-spa", name: "Massage aux galets", durationMin: 75, price: null, active: true },
  { id: "massage-dos", categoryId: "cat-spa", name: "Massage du dos", durationMin: 30, price: null, active: true },
  { id: "gommage", categoryId: "cat-spa", name: "Gommage corps", durationMin: 45, price: null, active: true },
  { id: "enveloppement", categoryId: "cat-spa", name: "Enveloppement hydratant", durationMin: 60, price: null, active: true },
  { id: "soin-pieds", categoryId: "cat-spa", name: "Soin des pieds", durationMin: 45, price: null, active: true },
  { id: "manucure", categoryId: "cat-ongles", name: "Manucure", durationMin: 45, price: null, active: true },
  { id: "pedicure", categoryId: "cat-ongles", name: "Pédicure", durationMin: 60, price: null, active: true },
  { id: "vernis-semi", categoryId: "cat-ongles", name: "Vernis semi-permanent", durationMin: 60, price: null, active: true },
  { id: "french", categoryId: "cat-ongles", name: "French", durationMin: 75, price: null, active: true },
  { id: "pose-gel", categoryId: "cat-ongles", name: "Pose gel", durationMin: 90, price: null, active: true },
  { id: "capsules", categoryId: "cat-ongles", name: "Pose de capsules", durationMin: 90, price: null, active: true },
  { id: "nail-art", categoryId: "cat-ongles", name: "Nail art", durationMin: 30, price: null, active: true },
  { id: "depose", categoryId: "cat-ongles", name: "Dépose", durationMin: 30, price: null, active: true },
  { id: "soin-visage", categoryId: "cat-esthetique", name: "Soin visage éclat", durationMin: 60, price: null, active: true },
  { id: "nettoyage-peau", categoryId: "cat-esthetique", name: "Nettoyage de peau", durationMin: 75, price: null, active: true },
  { id: "epilation-sourcils", categoryId: "cat-esthetique", name: "Épilation des sourcils", durationMin: 20, price: null, active: true },
  { id: "epilation-corps", categoryId: "cat-esthetique", name: "Épilation jambes et corps", durationMin: 45, price: null, active: true },
  { id: "teinture-sourcils", categoryId: "cat-esthetique", name: "Teinture des sourcils", durationMin: 30, price: null, active: true },
  { id: "rehaussement-cils", categoryId: "cat-esthetique", name: "Rehaussement de cils", durationMin: 60, price: null, active: true },
  { id: "maquillage-jour", categoryId: "cat-esthetique", name: "Maquillage de jour", durationMin: 45, price: null, active: true },
  { id: "maquillage-soiree", categoryId: "cat-esthetique", name: "Maquillage de soirée", durationMin: 60, price: null, active: true },
  { id: "mise-en-beaute", categoryId: "cat-esthetique", name: "Mise en beauté mariée", durationMin: 120, price: null, active: true },
];

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `${price.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0")}\u00a0F\u00a0CFA`;
}

export function servicesByCategory(categoryId: string): Service[] {
  return services.filter((s) => s.active && s.categoryId === categoryId);
}
