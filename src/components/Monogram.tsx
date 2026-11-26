// Monogramme ZST en carré (brand book, planche 13) : les lettres tournent autour d'un centre.
// Z (0°) · S (90°) · Z (180°) · T (270°). Composé en Bodoni Moda, pas de dessin ajouté.
export default function Monogram({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`mono ${className}`.trim()} style={{ ["--mono" as string]: `${size}px` }} aria-hidden="true">
      <span className="mono__l mono__l--z1">Z</span>
      <span className="mono__l mono__l--s">S</span>
      <span className="mono__l mono__l--t">T</span>
      <span className="mono__l mono__l--z2">Z</span>
    </div>
  );
}
