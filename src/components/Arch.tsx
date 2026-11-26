import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  position?: string;
  ratio?: string; // ex. "3 / 4.8"
  sizes?: string;
  priority?: boolean;
  parallax?: boolean;
  className?: string;
};

// L'arche : forme signature. Demi-cercle en haut, base droite.
export default function Arch({
  src, alt, position = "center", ratio = "3 / 4", sizes = "(min-width: 1280px) 30vw, 90vw",
  priority, parallax = true, className = "",
}: Props) {
  return (
    <div className={`arch ${className}`.trim()} style={{ aspectRatio: ratio }} {...(parallax ? { "data-parallax": true } : {})}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: position }} />
    </div>
  );
}
