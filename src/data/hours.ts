// Même forme que la future table `opening_hours`. À compléter avec le salon.
export type OpeningHours = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lundi
  label: string;
  opens: string | null; // "09:30"
  closes: string | null;
};

export const openingHours: OpeningHours[] = [
  { weekday: 1, label: "Lundi", opens: null, closes: null },
  { weekday: 2, label: "Mardi", opens: null, closes: null },
  { weekday: 3, label: "Mercredi", opens: null, closes: null },
  { weekday: 4, label: "Jeudi", opens: null, closes: null },
  { weekday: 5, label: "Vendredi", opens: null, closes: null },
  { weekday: 6, label: "Samedi", opens: null, closes: null },
  { weekday: 7, label: "Dimanche", opens: null, closes: null },
];

export const hoursDefined = openingHours.some((h) => h.opens && h.closes);
