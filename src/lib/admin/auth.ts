// Connexion à l'espace de gestion : mot de passe unique (ADMIN_PASSWORD) + cookie signé (HMAC), valable 12 h.
// Compatible Edge (middleware) : Web Crypto uniquement.
export const COOKIE = "zst_admin";
const TTL_MS = 12 * 3_600_000;

const enc = new TextEncoder();
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "zst-dev-secret";
export const adminPassword = () => process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "zst-dev");

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSession(now = Date.now()): Promise<string> {
  const exp = String(now + TTL_MS);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySession(value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const good = await hmac(exp);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(input: string): boolean {
  const pw = adminPassword();
  if (!pw || input.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}
