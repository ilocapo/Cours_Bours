"use client";
import { usePathname } from "next/navigation";
import { bookingProps } from "./BookingButton";

// Barre fixe en bas, mobile seulement. Pointe vers la réservation.
export default function StickyBar() {
  const path = usePathname();
  if (path.startsWith("/reserver") || path.startsWith("/admin")) return null;
  const book = bookingProps();
  return (
    <a className="bar" {...book}>
      <span className="lb">Réserver un rituel</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/traits/fleche-prune.svg" alt="" aria-hidden="true" width={34} height={12} />
    </a>
  );
}
