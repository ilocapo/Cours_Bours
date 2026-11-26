import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import LazyVideo from "./LazyVideo";

type Props = {
  tone?: "prune" | "noir" | "iv";
  image?: { src: string; alt: string; position?: string };
  video?: { src: string; poster?: string; label: string };
  href?: string;
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

// « Un voile par rituel » (brand book, planche 15) : texte à gauche, média à droite,
// et un voile de la couleur du fond qui s'estompe vers la droite jusqu'à voir le média.
export default function Band({ tone = "prune", image, video, href, size = "md", className = "", children }: Props) {
  const inner = (
    <>
      <div className="band__media" aria-hidden={!!video}>
        {image && <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 70vw, 100vw" style={{ objectFit: "cover", objectPosition: image.position ?? "center" }} />}
        {video && <LazyVideo src={video.src} poster={video.poster} label={video.label} />}
      </div>
      <div className="band__txt">{children}</div>
    </>
  );
  const cls = `band band--${tone} band--${size} ${className}`.trim();
  return href ? <Link href={href} className={cls} data-arch-band>{inner}</Link> : <div className={cls} data-arch-band>{inner}</div>;
}
