import Picto from "./Picto";

// Pictos PLEINS : arche pleine, picto dedans (ivoire/prune), taille constante.
export default function Pastille({ name, tone = "ivoire" }: { name: string; tone?: "ivoire" | "prune" }) {
  // tone = couleur de l'arche. Arche ivoire → picto prune, et inversement.
  return (
    <span className={`pastille pastille--${tone}`} aria-hidden="true">
      <Picto name={name} tone={tone === "ivoire" ? "prune" : "ivoire"} size={26} />
    </span>
  );
}
