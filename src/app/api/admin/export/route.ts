import { getCurrent } from "@/lib/admin/session";
import { can } from "@/lib/admin/roles";
import { getStore } from "@/lib/booking/store";
import { toView } from "@/lib/booking/service";
import { computeStats } from "@/lib/booking/stats";
import { computePayroll } from "@/lib/booking/payroll";
import { hhmmColon, isoToLocal, todayLocal } from "@/lib/booking/time";
import { METHOD_LABEL, SOURCE_LABEL } from "@/lib/booking/types";
import { categories } from "@/data/categories";
import { formatPhone } from "@/lib/phone";
import { toCsv, toXls, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = { confirmed: "Confirmé", cancelled: "Annulé", done: "Terminé", noshow: "Absente" };
const INV: Record<string, string> = { due: "À payer", partial: "Partiel", paid: "Payée", void: "Annulée" };

// GET /api/admin/export?type=reservations|clients|factures|journal&format=csv|xls&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const me = await getCurrent();
  if (!me || !can(me.role, "exports")) return new Response("Non autorisé", { status: 403 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type") ?? "reservations";
  const format = u.searchParams.get("format") === "xls" ? "xls" : "csv";
  const to = u.searchParams.get("to") || todayLocal();
  const from = u.searchParams.get("from") || "2000-01-01";
  const store = await getStore();
  const inR = (iso: string) => { const d = isoToLocal(iso).date; return d >= from && d <= to; };
  let name = type; let rows: Cell[][] = [];

  if (type === "reservations") {
    const [list, staff] = await Promise.all([store.listBookings(), store.listStaff()]);
    void staff;
    rows = [["Date", "Début", "Fin", "Prestation", "Univers", "Employée", "Cliente", "Téléphone", "E-mail", "Canal", "Statut", "Note"]];
    for (const b of list.filter((x) => inR(x.startsAt))) {
      const v = await toView(store, b);
      const svc = (await store.listServices()).find((s) => s.id === b.serviceId);
      rows.push([isoToLocal(b.startsAt).date, hhmmColon(isoToLocal(b.startsAt).minutes), hhmmColon(isoToLocal(b.endsAt).minutes), v.serviceName, categories.find((c) => c.id === svc?.categoryId)?.name ?? "", v.staffName ?? "", v.clientName, formatPhone(v.clientPhone), v.clientEmail ?? "", SOURCE_LABEL[b.source], STATUS[b.status], b.note]);
    }
  } else if (type === "clients") {
    if (!can(me.role, "clients") && me.role !== "comptable") return new Response("Non autorisé", { status: 403 });
    const [clients, bookings, invoices] = await Promise.all([store.listClients(), store.listBookings(), store.listInvoices()]);
    rows = [["Nom", "Téléphone", "E-mail", "Rappels acceptés", "Créée le", "Rendez-vous", "Terminés", "Dernier rendez-vous", "Total facturé (F CFA)", "Notes"]];
    for (const c of clients) {
      const mine = bookings.filter((b) => b.clientId === c.id);
      rows.push([c.name, formatPhone(c.phone), c.email ?? "", c.consentReminders ? "oui" : "non", isoToLocal(c.createdAt).date, mine.filter((b) => b.status !== "cancelled").length, mine.filter((b) => b.status === "done").length, mine.at(-1) ? isoToLocal(mine.at(-1)!.startsAt).date : "", invoices.filter((i) => i.clientId === c.id && i.status !== "void").reduce((s, i) => s + i.totalXof, 0), c.notes]);
    }
  } else if (type === "factures") {
    const [invoices, clients, staff] = await Promise.all([store.listInvoices(), store.listClients(), store.listStaff()]);
    name = "factures";
    rows = [["Numéro", "Date", "Cliente", "Prestations", "Remise (F CFA)", "Total (F CFA)", "Payé (F CFA)", "Reste (F CFA)", "Mode de paiement", "Statut", "Date du paiement", "Employée", "Envoyée le"]];
    for (const i of invoices.filter((x) => inR(x.issuedAt)).reverse())
      rows.push([i.number, isoToLocal(i.issuedAt).date, clients.find((c) => c.id === i.clientId)?.name ?? "", i.lines.map((l) => l.label).join(" + "), i.discountXof, i.totalXof, i.paidXof, i.status === "void" ? 0 : i.totalXof - i.paidXof, i.method ? METHOD_LABEL[i.method] : "", INV[i.status], i.paidAt ? isoToLocal(i.paidAt).date : "", staff.find((s) => s.id === i.staffId)?.name ?? "", i.sentAt ? isoToLocal(i.sentAt).date : ""]);
  } else if (type === "paie") {
    if (!can(me.role, "payroll")) return new Response("Non autorisé", { status: 403 });
    const month = from.slice(0, 7);
    const pay = await computePayroll(store, month);
    name = `paie-${month}`;
    rows = [["Personne", "Heures faites", "Heures prévues", "Écart", "Jours pointés", "Retards", "Congés", "Maladie", "Autres absences", "Prestations terminées", "Facturé (F CFA)"]];
    for (const r of pay) rows.push([r.name, +(r.workedMin / 60).toFixed(2), +(r.plannedMin / 60).toFixed(2), +((r.workedMin - r.plannedMin) / 60).toFixed(2), r.daysWorked, r.lateCount, r.leaveDays, r.sickDays, r.otherDays, r.prestations, r.invoicedXof]);
  } else if (type === "journal") {
    const s = await computeStats(store, from, to);
    name = "journal-des-ventes";
    rows = [["Date", "Facturé (F CFA)", "Encaissé (F CFA)", "Rendez-vous"], ...s.parJour.map((d) => [d.date, d.facture, d.encaisse, d.rdv] as Cell[]), ["Total", s.facture, s.encaisse, s.rdv]];
  } else return new Response("Type inconnu", { status: 400 });

  const file = `zst-${name}-${from === "2000-01-01" ? "tout" : from}_${to}.${format}`;
  const body = format === "csv" ? toCsv(rows) : toXls(name, rows);
  return new Response(body, { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.ms-excel; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"` } });
}
