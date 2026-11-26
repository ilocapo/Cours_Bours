// Le salon est au Bénin : UTC+1 toute l'année, pas d'heure d'été. On travaille en heure locale fixe.
export const TZ_OFFSET_MIN = 60;
const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** « YYYY-MM-DD » + minutes depuis minuit (heure du salon) → instant UTC en ISO. */
export function localToIso(date: string, minutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes - TZ_OFFSET_MIN)).toISOString();
}

export function isoToLocal(iso: string): { date: string; minutes: number; weekday: number } {
  const t = new Date(iso).getTime() + TZ_OFFSET_MIN * 60_000;
  const d = new Date(t);
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), weekday: wd };
}

export const todayLocal = (now = new Date()) => isoToLocal(now.toISOString()).date;

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Lundi de la semaine contenant `date`. */
export const weekStart = (date: string) => addDays(date, 1 - weekdayOf(date));

export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))} h ${pad(minutes % 60)}`.replace(" h 00", " h");
export const hhmmColon = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
export const parseHHMM = (s: string): number => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };

const DAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const dayName = (date: string) => DAYS[weekdayOf(date)];
export function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DAYS[weekdayOf(date)]} ${d === 1 ? "1er" : d} ${MONTHS[m - 1]} ${y}`;
}
export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 4)}.`;
}
export const longWhen = (iso: string) => { const l = isoToLocal(iso); return `${longDate(l.date)} à ${hhmm(l.minutes)}`; };
