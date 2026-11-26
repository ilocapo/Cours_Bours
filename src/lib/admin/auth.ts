// Session de l'espace de gestion : cookie signé (HMAC) contenant l'utilisateur et son rôle, valable 12 h.
// Compatible Edge (middleware) : Web Crypto uniquement. Le hachage des mots de passe est dans password.ts (Node).
import type { Role } from "@/lib/booking/types";

export const COOKIE = "zst_admin";
const TTL_MS = 12 * 3_600_000;
export const ENV_ADMIN_ID = "env-admin"; // compte de secours : identifiant « admin » + ADMIN_PASSWORD

const enc = new TextEncoder();
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "zst-dev-secret";
export const adminPassword = () => process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "zst-dev");
const ROLES: Role[] = ["super_admin", "gerant", "employe", "comptable"];

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSession(uid: string, role: Role, now = Date.now()): Promise<string> {
  const body = `${uid}.${role}.${now + TTL_MS}`;
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(value: string | undefined, now = Date.now()): Promise<{ uid: string; role: Role } | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [uid, role, exp, sig] = parts;
  if (!ROLES.includes(role as Role) || Number(exp) < now) return null;
  const good = await hmac(`${uid}.${role}.${exp}`);
  if (good.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? { uid, role: role as Role } : null;
}

export function checkPassword(input: string): boolean {
  const pw = adminPassword();
  if (!pw || input.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}
