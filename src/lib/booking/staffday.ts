import type { OpeningHours } from "@/data/hours";
import type { Staff } from "@/data/staff";
import type { Absence } from "./types";
import { parseHHMM, weekdayOf } from "./time";

export type DayState =
  | { kind: "closed"; label: string }
  | { kind: "off"; label: string }          // repos
  | { kind: "absence"; label: string }      // congé, maladie
  | { kind: "work"; start: number; end: number; label: string };

const fmt = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;

/** Ce que fait une personne un jour donné : travaille (de… à…), repos, absente, ou salon fermé. */
export function dayState(st: Staff, date: string, hours: OpeningHours[], absences: Absence[], closures: { date: string; label: string }[] = []): DayState {
  const closure = closures.find((c) => c.date === date);
  if (closure) return { kind: "closed", label: closure.label || "Fermé" };
  const ab = absences.find((a) => a.staffId === st.id && a.status === "approuvee" && a.fromDate <= date && date <= a.toDate);
  if (ab) return { kind: "absence", label: ab.kind === "maladie" ? "Maladie" : ab.kind === "conge" ? "Congé" : "Absente" };
  const wd = weekdayOf(date);
  let open: string | null | undefined; let close: string | null | undefined;
  if (st.schedule) { const sh = st.schedule[wd]; open = sh?.start; close = sh?.end; }
  else { const h = hours.find((x) => x.weekday === wd); open = h?.opens; close = h?.closes; }
  if (!open || !close) return { kind: "off", label: "Repos" };
  const s = parseHHMM(open), e = parseHHMM(close);
  return { kind: "work", start: s, end: e, label: `${fmt(s)}–${fmt(e)}` };
}
