import Monogram from "./Monogram";

// Planche 10 du brand book : le monogramme ZST en carré, dans une arche (filet fin ou pleine).
export default function MonoArch({ variant = "filet", tone = "prune", size = 96, className = "" }: { variant?: "filet" | "pleine"; tone?: "prune" | "ivoire"; size?: number; className?: string }) {
  return (
    <div className={`monoarch monoarch--${variant} monoarch--${tone} ${className}`.trim()} style={{ ["--mono" as string]: `${size}px` }} data-fade>
      <Monogram size={size} />
    </div>
  );
}
