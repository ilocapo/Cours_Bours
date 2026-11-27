import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { site } from "@/data/site";
import { hhmm, isoToLocal, longDate, longWhen } from "./time";
import { render, scenario, templateFor } from "./templates";
import type { BookingView, Invoice, Settings, TemplateKey } from "./types";
import { METHOD_LABEL } from "./types";
import { formatXof } from "./money";

export type Mail = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: string }[] };

const OUTBOX = process.env.ZST_OUTBOX_FILE || join(process.cwd(), ".data", "outbox.json");

/** Envoi via Resend. Sans clé (développement) : le message est écrit dans .data/outbox.json. */
export async function sendMail(m: Mail): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production" && !process.env.ZST_OUTBOX_FILE) return { ok: false, error: "RESEND_API_KEY manquante" };
    mkdirSync(dirname(OUTBOX), { recursive: true });
    const list = existsSync(OUTBOX) ? JSON.parse(readFileSync(OUTBOX, "utf8")) : [];
    list.push({ ...m, at: new Date().toISOString() });
    writeFileSync(OUTBOX, JSON.stringify(list, null, 2));
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || `${site.name} <onboarding@resend.dev>`,
        to: [m.to], subject: m.subject, html: m.html, text: m.text,
        attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'envoi" };
  }
}

const IV = "#F2EADF", PR = "#1C1013";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Modèle aux couleurs ZST : fond brun prune, texte ivoire, titre en Bodoni (Georgia en secours), arche ivoire pour le logo.
function layout(title: string, bodyHtml: string, foot: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:${PR};font-family:Helvetica,Arial,sans-serif;color:${IV}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PR}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding-bottom:28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${IV};border-radius:40px 40px 0 0;padding:10px 9px 5px"><img src="${site.url}/logo/logo-zst.png" width="46" alt="ZST Beauty Center" style="display:block;border:0"></td></tr></table></td></tr>
<tr><td style="font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:32px;line-height:1.1;padding-bottom:20px;color:${IV}">${title}</td></tr>
<tr><td style="font-size:16px;line-height:1.7;color:${IV}">${bodyHtml}</td></tr>
<tr><td style="padding-top:36px;border-top:1px solid rgba(242,234,223,.2);margin-top:36px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,234,223,.7);line-height:1.8">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${IV};color:${PR};text-decoration:none;border-radius:999px;padding:14px 30px;font-size:12px;letter-spacing:.2em;text-transform:uppercase">${label}</a>`;

const recap = (b: BookingView) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 24px;border:1px solid rgba(242,234,223,.25);border-radius:14px;width:100%"><tr><td style="padding:18px 20px;line-height:1.8">
<strong style="font-weight:400;font-family:Georgia,serif;font-size:20px">${esc(b.serviceName)}</strong><br>${esc(longWhen(b.startsAt))}<br>
<span style="opacity:.8">${site.address ? esc(site.address) : "ZST Beauty Center"}${site.addressNote ? ` · ${esc(site.addressNote)}` : ""}</span></td></tr></table>`;

const link = (b: { token: string }) => `${site.url}/reservation/${b.token}`;
const footer = (b?: { token: string }, reminders = false) =>
  `${esc(site.name)} · ${esc(site.phone ?? "")}<br>${b && reminders ? `<a href="${link(b)}?rappels=off" style="color:${IV}">Ne plus recevoir de rappels</a>` : ""}`;

const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

export type MailCtx = { settings: Settings; ics?: string };
const varsFor = (b: BookingView): Record<string, string> => {
  const l = isoToLocal(b.startsAt);
  return {
    prenom: b.clientName.split(" ")[0], nom: b.clientName, prestation: b.serviceName, date: longDate(l.date), heure: hhmm(l.minutes),
    quand: longWhen(b.startsAt), adresse: site.address ?? "", telephone: site.phone ?? "",
  };
};

/** Un e-mail de scénario : texte modifiable (sujet, titre, corps) + bloc récapitulatif et bouton fixes. */
export function scenarioMail(key: TemplateKey, b: BookingView, ctx: MailCtx): Mail | null {
  const tpl = templateFor(ctx.settings, key);
  if (!tpl.enabled || !b.clientEmail) return null;
  const sc = scenario(key);
  const v = varsFor(b);
  const reviewUrl = ctx.settings.googleReviewUrl || site.mapsUrl;
  const href = key === "thanks" ? reviewUrl : key === "client_cancel" || key === "noshow" ? `${site.url}/reserver` : link(b);
  const withRecap = key !== "thanks" && key !== "noshow";
  const body = paragraphs(render(tpl.body, v)) + (withRecap ? recap(b) : "") + `<p>${btn(href, esc(sc.button))}</p>`;
  const reminders = key === "reminder_d1" || key === "reminder_h2" || key === "thanks";
  return {
    to: b.clientEmail, subject: render(tpl.subject, v),
    html: layout(esc(render(tpl.title, v)), body, footer(b, reminders)),
    text: `${render(tpl.body, v)}\n\n${sc.button} : ${href}\n\n${site.name}`,
    attachments: key === "confirmation" && ctx.ics ? [{ filename: "rendez-vous-zst.ics", content: Buffer.from(ctx.ics).toString("base64") }] : undefined,
  };
}

export function salonMail(b: BookingView, kind: "salon_new" | "salon_cancel"): Mail {
  const title = kind === "salon_new" ? "Nouvelle réservation" : "Réservation annulée";
  return {
    to: "", subject: `${title} : ${b.clientName}, ${longWhen(b.startsAt)}`,
    html: layout(title, `${recap(b)}<p>${esc(b.clientName)}<br>${esc(b.clientPhone)}${b.clientEmail ? `<br>${esc(b.clientEmail)}` : ""}</p>${b.note ? `<p>Note : ${esc(b.note)}</p>` : ""}<p>${btn(`${site.url}/admin/agenda?b=${b.id}`, "Ouvrir dans l'agenda")}</p>`, esc(site.name)),
    text: `${title}\n${b.clientName} (${b.clientPhone})\n${b.serviceName}, ${longWhen(b.startsAt)}`,
  };
}

export function invoiceMail(inv: Invoice, clientName: string, to: string): Mail {
  const first = clientName.split(" ")[0];
  const rows = inv.lines.map((l) => `<tr><td style="padding:6px 0">${esc(l.label)}${l.qty > 1 ? ` × ${l.qty}` : ""}</td><td align="right" style="padding:6px 0">${esc(formatXof(l.qty * l.unitXof))}</td></tr>`).join("");
  const remise = inv.discountXof ? `<tr><td style="padding:6px 0;opacity:.8">Remise</td><td align="right" style="padding:6px 0">− ${esc(formatXof(inv.discountXof))}</td></tr>` : "";
  const reste = inv.totalXof - inv.paidXof;
  const state = inv.status === "paid" ? `Réglée${inv.method ? ` · ${METHOD_LABEL[inv.method]}` : ""}` : reste > 0 ? `Reste à régler : ${formatXof(reste)}` : "";
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 24px;border-top:1px solid rgba(242,234,223,.25);border-bottom:1px solid rgba(242,234,223,.25)">${rows}${remise}
<tr><td style="padding:12px 0 6px;font-family:Georgia,serif;font-size:20px">Total</td><td align="right" style="padding:12px 0 6px;font-family:Georgia,serif;font-size:20px">${esc(formatXof(inv.totalXof))}</td></tr></table>`;
  return {
    to, subject: `Votre facture ${inv.number} · ${site.name}`,
    html: layout(`Facture ${esc(inv.number)}`, `<p>Bonjour ${esc(first)},</p><p>Merci pour votre visite. Voici votre facture.</p>${table}${state ? `<p>${esc(state)}</p>` : ""}<p>${btn(`${site.url}/facture/${inv.token}`, "Voir et imprimer")}</p>`, `${esc(site.name)} · ${esc(site.phone ?? "")}`),
    text: `Bonjour ${first},\n\nFacture ${inv.number} : ${formatXof(inv.totalXof)}.${state ? `\n${state}` : ""}\nVoir et imprimer : ${site.url}/facture/${inv.token}\n\n${site.name}`,
  };
}

export function testMail(to: string): Mail {
  return {
    to, subject: "Test d'envoi : ZST Beauty Center",
    html: layout("L'envoi d'e-mails fonctionne.", `<p>Ce message confirme que la gestion peut envoyer des e-mails aux couleurs de ZST.</p>`, esc(site.name)),
    text: "L'envoi d'e-mails fonctionne.",
  };
}
