type Props = { name: "trait" | "souligne" | "cadre" | "arche" | "fleche" | "fleuron"; tone?: "ivoire" | "prune"; className?: string; draw?: boolean };

// Trait plume fin. « prune » pour les fonds clairs.
export default function Trait({ name, tone = "ivoire", className = "", draw = true }: Props) {
  const file = tone === "prune" ? `${name}-prune` : name;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/img/traits/${file}.svg`} alt="" aria-hidden="true" className={`trait ${className}`.trim()} {...(draw ? { "data-draw": true } : {})} />
  );
}
