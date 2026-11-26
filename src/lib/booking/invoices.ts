import { randomUUID } from "node:crypto";
import type { Store } from "./store";
import type { Invoice, InvoiceLine, PayMethod } from "./types";
import { newToken } from "./service";
import { invoiceMail, sendMail } from "./mail";
import { isoToLocal } from "./time";

export const linesTotal = (lines: InvoiceLine[]) => lines.reduce((s, l) => s + l.qty * l.unitXof, 0);

export function statusFor(total: number, paid: number, current?: Invoice["status"]): Invoice["status"] {
  if (current === "void") return "void";
  if (paid >= total && total > 0) return "paid";
  return paid > 0 ? "partial" : "due";
}

/** FAC-2026-0001 : numérotation continue par année, sans trou ni doublon. */
export async function nextInvoiceNumber(store: Store, now = new Date()): Promise<string> {
  const year = isoToLocal(now.toISOString()).date.slice(0, 4);
  const prefix = `FAC-${year}-`;
  const max = (await store.listInvoices()).filter((i) => i.number.startsWith(prefix)).reduce((m, i) => Math.max(m, Number(i.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export type NewInvoice = {
  bookingId: string | null; clientId: string; staffId: string | null;
  lines: InvoiceLine[]; discountXof?: number; paidXof?: number; method?: PayMethod | null; note?: string; createdBy: string | null;
};

export async function createInvoice(store: Store, n: NewInvoice, now = new Date()): Promise<Invoice> {
  const total = Math.max(0, linesTotal(n.lines) - (n.discountXof ?? 0));
  const paid = Math.min(total, n.paidXof ?? 0);
  const inv: Invoice = {
    id: randomUUID(), number: await nextInvoiceNumber(store, now), token: newToken(), bookingId: n.bookingId, clientId: n.clientId, staffId: n.staffId,
    issuedAt: now.toISOString(), lines: n.lines, discountXof: n.discountXof ?? 0, totalXof: total, paidXof: paid, method: paid > 0 ? n.method ?? "especes" : null,
    paidAt: paid > 0 ? now.toISOString() : null, status: statusFor(total, paid), note: n.note ?? "", sentAt: null, createdBy: n.createdBy,
  };
  await store.saveInvoice(inv);
  return inv;
}

export async function addPayment(store: Store, id: string, amountXof: number, method: PayMethod, now = new Date()): Promise<Invoice | null> {
  const inv = await store.getInvoice(id);
  if (!inv || inv.status === "void") return null;
  const paid = Math.min(inv.totalXof, inv.paidXof + Math.max(0, amountXof));
  const next: Invoice = { ...inv, paidXof: paid, method, paidAt: now.toISOString(), status: statusFor(inv.totalXof, paid) };
  await store.saveInvoice(next);
  return next;
}

/** Envoie la facture par e-mail à la cliente (lien d'impression inclus). */
export async function sendInvoice(store: Store, id: string): Promise<{ ok: boolean; error?: string }> {
  const inv = await store.getInvoice(id);
  if (!inv) return { ok: false, error: "Facture introuvable." };
  const client = await store.getClient(inv.clientId);
  if (!client?.email) return { ok: false, error: "Cette cliente n'a pas d'adresse e-mail." };
  const r = await sendMail(invoiceMail(inv, client.name, client.email));
  if (r.ok) await store.saveInvoice({ ...inv, sentAt: new Date().toISOString() });
  return r;
}
