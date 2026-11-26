import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/data/site";

type Props = {
  variant?: "ivoire" | "prune" | "outline" | "outline-prune";
  size?: "md" | "sm";
  className?: string;
  children?: ReactNode;
};

// Sans lien Planity/Fresha, on réserve par WhatsApp (message prérempli).
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ||
  (site.whatsapp
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite réserver un rituel chez ZST Beauty Center.")}`
    : "");

export function bookingProps() {
  return BOOKING_URL
    ? { href: BOOKING_URL, target: "_blank", rel: "noopener noreferrer" }
    : { href: "/reserver" };
}

// Un seul bouton « Réserver » (la forme du brand book : haut en arche, base droite). Deux tailles.
export default function BookingButton({ variant = "ivoire", size = "md", className = "", children = "Réserver" }: Props) {
  const cls = `btn btn--${variant} btn--${size} lb ${className}`.trim();
  if (BOOKING_URL) {
    return <a className={cls} href={BOOKING_URL} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  return <Link className={cls} href="/reserver">{children}</Link>;
}

/** Bouton secondaire vers une page du site (même forme, même tailles). */
export function ButtonLink({ href, variant = "outline", size = "md", children }: { href: string; variant?: Props["variant"]; size?: "md" | "sm"; children: ReactNode }) {
  return <Link className={`btn btn--${variant} btn--${size} lb`} href={href}>{children}</Link>;
}
