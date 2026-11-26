import { createElement } from "react";

type Props = {
  lines: string[];
  as?: "h1" | "h2" | "h3" | "div";
  className?: string;
  plume?: boolean;
};

// Titre Bodoni, initiale en ZST Plume, révélé ligne par ligne (voir Motion).
export default function Title({ lines, as = "h2", className = "", plume = true }: Props) {
  return createElement(
    as,
    { className: `bod title ${className}`.trim(), "data-title": true },
    lines.map((line, i) => (
      <span className="line" key={i}>
        <span className="line-in">
          {i === 0 && plume ? (
            <>
              <span className="pl" aria-hidden={false}>{line.charAt(0)}</span>
              {line.slice(1)}
            </>
          ) : (
            line
          )}
        </span>
      </span>
    )),
  );
}
