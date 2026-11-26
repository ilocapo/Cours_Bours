import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  position?: string;
  ratio?: string; // ex. "3 / 4.8"
  sizes?: string;
  priority?: boolean;
  parallax?: boolean;
  className?: string;
  /** Cadres du brand book (planche 22) : pleine, filet, fenêtre, légendée. */
  frame?: "pleine" | "filet" | "fenetre" | "legende";
  /** Légende (cadre « légendée ») : Bodoni, posée sur la photo. */
  caption?: ReactNode;
  /** Couleur du cadre « fenêtre » (fond opposé à la section). */
  tone?: "iv" | "prune";
  /** Pastille / sticker posé sur l'arche (arche pleine). */
  sticker?: ReactNode;
};

// L'arche : forme signature. Demi-cercle en haut, base droite.
export default function Arch({
  src, alt, position = "center", ratio = "3 / 4", sizes = "(min-width: 1280px) 30vw, 90vw",
  priority, parallax = true, className = "", frame = "pleine", caption, tone = "iv", sticker,
}: Props) {
  const img = <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: position }} />;
  const cls = `arch arch--${frame} ${frame === "fenetre" ? `arch--f-${tone}` : ""} ${className}`.trim();
  const attrs = { "data-arch": true, ...(parallax ? { "data-parallax": true } : {}) };
  if (frame === "pleine") {
    return (
      <div className={cls} style={{ aspectRatio: ratio }} {...attrs}>
        {img}
        {sticker}
      </div>
    );
  }
  return (
    <div className={cls} style={{ aspectRatio: ratio }} {...attrs}>
      <div className="arch__in">{img}</div>
      {caption && <span className="arch__cap bod">{caption}</span>}
      {sticker}
    </div>
  );
}
