import { createElement } from "react";
import { fr } from "@/lib/fr";

// Lettres lisibles en ZST Plume (vérifié à l'écran). Les autres (B, F, H, I, J, K, P, Q, R, T, X…)
// se lisent mal : la lettrine passe alors en Bodoni Moda italique.
const PLUME_OK = new Set("ACDEGLMNOSUVWZ".split(""));
// Resserre la lettrine contre le mot (chaque lettre Plume a sa propre chasse).
const PLUME_KERN: Record<string, string> = {
  A: "-0.06em", C: "-0.12em", D: "-0.06em", E: "-0.08em", G: "-0.1em", L: "-0.05em", M: "-0.05em",
  N: "-0.05em", O: "-0.1em", S: "-0.09em", U: "-0.07em", V: "-0.05em", W: "-0.05em", Z: "-0.05em",
};

type Props = {
  lines: string[];
  as?: "h1" | "h2" | "h3" | "div";
  className?: string;
  /** Lettrine sur la première lettre. Une seule par écran. */
  initial?: boolean;
  /** Indice d'une ligne en italique bronze (touche rare, comme dans le brand book). */
  accent?: number;
};

export default function Title({ lines, as = "h2", className = "", initial = false, accent }: Props) {
  return createElement(
    as,
    { className: `bod title ${className}`.trim(), "data-title": true },
    lines.map((raw, i) => {
      const line = fr(raw);
      const first = line.charAt(0);
      const upper = first.toUpperCase();
      let content: React.ReactNode = line;
      if (i === 0 && initial) {
        content = PLUME_OK.has(upper) ? (
          <>
            <span className="pl" style={{ marginRight: PLUME_KERN[upper] }}>{first}</span>
            {line.slice(1)}
          </>
        ) : (
          <>
            <span className="ini">{first}</span>
            {line.slice(1)}
          </>
        );
      }
      return (
        <span className="line" key={i}>
          <span className={`line-in${accent === i ? " accent" : ""}`}>{content}</span>
        </span>
      );
    }),
  );
}
