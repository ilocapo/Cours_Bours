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

/** Horaires du jour (fuseau du Bénin), côté client. */
export function todayHours(now = new Date()): { label: string; open: string | null; close: string | null } {
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Africa/Porto-Novo" }).format(now);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const h = openingHours.find((x) => x.weekday === map[wd]) ?? openingHours[0];
  return { label: h.label, open: h.opens, close: h.closes };
}
