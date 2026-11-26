import Trait from "./Trait";

// Coupe droite entre deux sections : un trait plume fin posé sur la jonction.
export default function Seam({ tone = "ivoire" }: { tone?: "ivoire" | "prune" }) {
  return (
    <div className="seam" aria-hidden="true">
      <Trait name="trait" tone={tone} />
    </div>
  );
}
