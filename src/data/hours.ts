// Même forme que la future table `opening_hours`. Source : page Facebook du salon.
export type OpeningHours = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lundi
  label: string;
  opens: string | null; // "09:30"
  closes: string | null;
};

export const openingHours: OpeningHours[] = [
  { weekday: 1, label: "Lundi", opens: "09:00", closes: "20:00" },
  { weekday: 2, label: "Mardi", opens: "09:00", closes: "20:00" },
  { weekday: 3, label: "Mercredi", opens: "09:00", closes: "20:00" },
  { weekday: 4, label: "Jeudi", opens: "09:00", closes: "20:00" },
  { weekday: 5, label: "Vendredi", opens: "09:00", closes: "20:00" },
  { weekday: 6, label: "Samedi", opens: "09:00", closes: "20:00" },
  { weekday: 7, label: "Dimanche", opens: "15:00", closes: "20:00" },
];

export const hoursDefined = openingHours.some((h) => h.opens && h.closes);
