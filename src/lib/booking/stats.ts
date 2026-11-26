import type { Store } from "./store";
import { addDays, isoToLocal } from "./time";
import { METHOD_LABEL, SOURCE_LABEL } from "./types";
import { categories } from "@/data/categories";

export type Point = { label: string; value: number };
export type Stats = {
  from: string; to: string;
  facture: number; encaisse: number; impaye: number; nbFactures: number; panier: number;
  rdv: number; faits: number; absences: number; annules: number; tauxAbsence: number; tauxAnnulation: number;
  nouvellesClientes: number; clientesFideles: number;
  parJour: { date: string; facture: number; encaisse: number; rdv: number }[];
  parCategorie: Point[]; parCanal: Point[]; parMethode: Point[]; parEmploye: Point[]; topPrestations: (Point & { xof: number })[];
  parHeure: Point[]; parJourSemaine: Point[];
};

const WD = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export async function computeStats(store: Store, from: string, to: string): Promise<Stats> {
  const [bookings, invoices, clients, services, staff] = await Promise.all([store.listBookings(), store.listInvoices(), store.listClients(), store.listServices(), store.listStaff()]);
  const inRange = (iso: string) => { const d = isoToLocal(iso).date; return d >= from && d <= to; };
  const bk = bookings.filter((b) => inRange(b.startsAt));
  const inv = invoices.filter((i) => i.status !== "void" && inRange(i.issuedAt));
  const paidInRange = invoices.filter((i) => i.status !== "void" && i.paidAt && inRange(i.paidAt));

  const facture = inv.reduce((s, i) => s + i.totalXof, 0);
  const encaisse = paidInRange.reduce((s, i) => s + i.paidXof, 0);
  const impaye = inv.reduce((s, i) => s + (i.totalXof - i.paidXof), 0);
  const faits = bk.filter((b) => b.status === "done").length;
  const absences = bk.filter((b) => b.status === "noshow").length;
  const annules = bk.filter((b) => b.status === "cancelled").length;
  const dueCount = faits + absences;

  const days: Stats["parJour"] = [];
  for (let d = from; d <= to && days.length < 400; d = addDays(d, 1)) days.push({ date: d, facture: 0, encaisse: 0, rdv: 0 });
  const dayIx = new Map(days.map((x, i) => [x.date, i]));
  for (const i of inv) { const k = dayIx.get(isoToLocal(i.issuedAt).date); if (k !== undefined) days[k].facture += i.totalXof; }
  for (const i of paidInRange) { const k = dayIx.get(isoToLocal(i.paidAt!).date); if (k !== undefined) days[k].encaisse += i.paidXof; }
  for (const b of bk.filter((x) => x.status !== "cancelled")) { const k = dayIx.get(isoToLocal(b.startsAt).date); if (k !== undefined) days[k].rdv += 1; }

  const svcOf = (id: string) => services.find((s) => s.id === id);
  const bookingOf = (id: string | null) => bookings.find((b) => b.id === id);
  const sum = (m: Map<string, number>): Point[] => [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const cat = new Map<string, number>(), meth = new Map<string, number>(), emp = new Map<string, number>(), top = new Map<string, { n: number; x: number }>();
  for (const i of inv) {
    const b = bookingOf(i.bookingId);
    const c = categories.find((x) => x.id === svcOf(b?.serviceId ?? "")?.categoryId)?.name ?? "Autre";
    cat.set(c, (cat.get(c) ?? 0) + i.totalXof);
    const sid = i.staffId ?? b?.staffId ?? null;
    const sn = staff.find((s) => s.id === sid)?.name ?? "Non assigné";
    emp.set(sn, (emp.get(sn) ?? 0) + i.totalXof);
    for (const l of i.lines) { const t = top.get(l.label) ?? { n: 0, x: 0 }; t.n += l.qty; t.x += l.qty * l.unitXof; top.set(l.label, t); }
  }
  for (const i of paidInRange) if (i.method) meth.set(METHOD_LABEL[i.method], (meth.get(METHOD_LABEL[i.method]) ?? 0) + i.paidXof);

  const canal = new Map<string, number>(), hours = new Map<number, number>(), wds = new Map<number, number>();
  for (const b of bk.filter((x) => x.status !== "cancelled")) {
    canal.set(SOURCE_LABEL[b.source], (canal.get(SOURCE_LABEL[b.source]) ?? 0) + 1);
    const l = isoToLocal(b.startsAt);
    hours.set(Math.floor(l.minutes / 60), (hours.get(Math.floor(l.minutes / 60)) ?? 0) + 1);
    wds.set(l.weekday, (wds.get(l.weekday) ?? 0) + 1);
  }

  const doneByClient = new Map<string, number>();
  for (const b of bookings.filter((x) => x.status === "done")) doneByClient.set(b.clientId, (doneByClient.get(b.clientId) ?? 0) + 1);

  return {
    from, to, facture, encaisse, impaye, nbFactures: inv.length, panier: inv.length ? Math.round(facture / inv.length) : 0,
    rdv: bk.filter((b) => b.status !== "cancelled").length, faits, absences, annules,
    tauxAbsence: dueCount ? Math.round((absences / dueCount) * 100) : 0, tauxAnnulation: bk.length ? Math.round((annules / bk.length) * 100) : 0,
    nouvellesClientes: clients.filter((c) => inRange(c.createdAt)).length, clientesFideles: [...doneByClient.values()].filter((n) => n >= 2).length,
    parJour: days, parCategorie: sum(cat), parCanal: sum(canal), parMethode: sum(meth), parEmploye: sum(emp),
    topPrestations: [...top.entries()].map(([label, t]) => ({ label, value: t.n, xof: t.x })).sort((a, b) => b.xof - a.xof).slice(0, 6),
    parHeure: [...Array(14)].map((_, i) => ({ label: `${i + 8} h`, value: hours.get(i + 8) ?? 0 })),
    parJourSemaine: WD.map((label, i) => ({ label, value: wds.get(i + 1) ?? 0 })),
  };
}
