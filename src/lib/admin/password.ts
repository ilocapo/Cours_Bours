import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt : « scrypt$sel$empreinte ». Jamais de mot de passe en clair dans la base.
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 32).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPasswordStrength(pw: string): string | null {
  if (pw.length < 8) return "Le mot de passe doit faire au moins 8 caractères.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Utilisez des lettres et au moins un chiffre.";
  return null;
}
