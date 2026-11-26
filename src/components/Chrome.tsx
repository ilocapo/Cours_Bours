import { fr } from "@/lib/fr";

// Les petites légendes en coins, comme sur les planches du brand book : en haut ou en bas d'une section.
export default function Chrome({ left, right, className = "" }: { left?: string; right?: string; className?: string }) {
  return (
    <div className={`chrome lb ${className}`.trim()} data-fade>
      <span>{left && fr(left)}</span>
      <span>{right && fr(right)}</span>
    </div>
  );
}
