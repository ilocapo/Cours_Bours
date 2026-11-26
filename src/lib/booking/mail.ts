import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { site } from "@/data/site";
import { longWhen } from "./time";
import type { BookingView } from "./types";

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

export function confirmationMail(b: BookingView, ics: string): Mail {
  const first = b.clientName.split(" ")[0];
  return {
    to: b.clientEmail!, subject: `Votre rendez-vous du ${longWhen(b.startsAt)}`,
    html: layout("Votre rendez-vous est confirmé.", `<p>Bonjour ${esc(first)},</p><p>Nous vous attendons chez ZST Beauty Center.</p>${recap(b)}
<p>${btn(link(b), "Voir, déplacer ou annuler")}</p><p style="font-size:14px;opacity:.8">Le fichier joint vous permet de l'ajouter à votre agenda. Pour déplacer le rendez-vous, annulez-le puis réservez un nouveau créneau, ou écrivez-nous sur WhatsApp.</p>`, footer(b, true)),
    text: `Bonjour ${first},\n\nVotre rendez-vous est confirmé : ${b.serviceName}, ${longWhen(b.startsAt)}.\nVoir, déplacer ou annuler : ${link(b)}\n\n${site.name}`,
    attachments: [{ filename: "rendez-vous-zst.ics", content: Buffer.from(ics).toString("base64") }],
  };
}

export function reminderMail(b: BookingView, kind: "reminder_d1" | "reminder_h2"): Mail {
  const first = b.clientName.split(" ")[0];
  const title = kind === "reminder_d1" ? "À demain chez ZST." : "On vous attend dans deux heures.";
  return {
    to: b.clientEmail!, subject: kind === "reminder_d1" ? `Rappel : demain, ${b.serviceName}` : `Rappel : aujourd'hui à ${longWhen(b.startsAt).split(" à ")[1]}`,
    html: layout(title, `<p>Bonjour ${esc(first)},</p><p>Un petit rappel de votre rendez-vous.</p>${recap(b)}<p>${btn(link(b), "Voir ou annuler")}</p>`, footer(b, true)),
    text: `Bonjour ${first},\n\nRappel de votre rendez-vous : ${b.serviceName}, ${longWhen(b.startsAt)}.\nVoir ou annuler : ${link(b)}`,
  };
}

export function thanksMail(b: BookingView): Mail {
  const first = b.clientName.split(" ")[0];
  return {
    to: b.clientEmail!, subject: "Merci pour votre visite",
    html: layout("Merci pour votre visite.", `<p>Bonjour ${esc(first)},</p><p>Merci d'avoir pris ce moment chez ZST. Votre avis nous aide beaucoup.</p><p>${btn(site.mapsUrl, "Laisser un avis")}</p>`, footer(b, true)),
    text: `Bonjour ${first}, merci pour votre visite. Laisser un avis : ${site.mapsUrl}`,
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
