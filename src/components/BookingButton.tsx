import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/data/site";

type Props = {
  variant?: "ivoire" | "prune";
  className?: string;
  children?: ReactNode;
};

// Un seul bouton « Réserver ». v1 : lien externe (Planity / Fresha).
// v2 : il ouvrira le parcours de réservation interne (/reserver).
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

export default function BookingButton({ variant = "ivoire", className = "", children = "Réserver" }: Props) {
  const cls = `btn btn--${variant} lb ${className}`.trim();
  if (BOOKING_URL) {
    return (
      <a className={cls} href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className={cls} href="/reserver">
      {children}
    </Link>
  );
}
